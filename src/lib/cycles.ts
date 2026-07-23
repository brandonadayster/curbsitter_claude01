import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Cycle/task generation (P4-01): for a collection date, create a
 * collection_cycle plus rollout and return tasks for every active property
 * whose schedule matches that weekday. Idempotent via the
 * (property, schedule, date) unique constraint.
 *
 * Service windows come from BUSINESS_CONFIG: rollout 5–10 p.m. the evening
 * before, return after collection on pickup day. America/Phoenix has no DST,
 * so a fixed -07:00 offset is correct year-round.
 */

const PHOENIX_OFFSET = "-07:00";

function phoenixTimestamp(date: string, time: string): string {
  return `${date}T${time}:00${PHOENIX_OFFSET}`;
}

function previousDay(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function phoenixWeekday(date: string): number {
  // Weekday of the calendar date in Phoenix; noon UTC avoids boundary issues.
  return new Date(`${date}T12:00:00${PHOENIX_OFFSET}`).getUTCDay();
}

export interface GenerationResult {
  cyclesCreated: number;
  tasksCreated: number;
  skippedExisting: number;
  skippedInactive: number;
}

export async function generateCyclesForDate(collectionDate: string): Promise<GenerationResult> {
  const supabase = createSupabaseAdminClient();
  const weekday = phoenixWeekday(collectionDate);

  const { data: schedules, error } = await supabase
    .from("collection_schedules")
    .select("id, property_id, weekday, properties!inner(id, status)")
    .eq("weekday", weekday)
    .eq("properties.status", "active");
  if (error) throw new Error(`Schedule lookup failed: ${error.message}`);

  // Pause/cancel gate: a property is only serviced when it has an active,
  // non-cancelling subscription. Paused, cancelled, or cancel-at-renewal
  // subscriptions are skipped so no cycle is generated for them.
  const propertyIds = [...new Set((schedules ?? []).map((s) => s.property_id))];
  const servicedPropertyIds = new Set<string>();
  if (propertyIds.length > 0) {
    const { data: subs, error: subsError } = await supabase
      .from("subscriptions")
      .select("property_id")
      .in("property_id", propertyIds)
      .eq("status", "active")
      .eq("cancel_at_period_end", false);
    if (subsError) throw new Error(`Subscription lookup failed: ${subsError.message}`);
    for (const sub of subs ?? []) servicedPropertyIds.add(sub.property_id);
  }

  const result: GenerationResult = {
    cyclesCreated: 0,
    tasksCreated: 0,
    skippedExisting: 0,
    skippedInactive: 0,
  };
  const rolloutDate = previousDay(collectionDate);

  for (const schedule of schedules ?? []) {
    if (!servicedPropertyIds.has(schedule.property_id)) {
      result.skippedInactive += 1;
      continue;
    }
    const { data: cycle, error: cycleError } = await supabase
      .from("collection_cycles")
      .insert({
        property_id: schedule.property_id,
        schedule_id: schedule.id,
        collection_date: collectionDate,
        state: "planned",
      })
      .select("id")
      .maybeSingle();

    if (cycleError) {
      // Unique violation → cycle already generated for this date; skip quietly.
      if (cycleError.code === "23505") {
        result.skippedExisting += 1;
        continue;
      }
      throw new Error(`Cycle creation failed: ${cycleError.message}`);
    }
    if (!cycle) continue;
    result.cyclesCreated += 1;

    const { error: tasksError } = await supabase.from("service_tasks").insert([
      {
        property_id: schedule.property_id,
        cycle_id: cycle.id,
        task_type: "rollout",
        status: "scheduled",
        window_start: phoenixTimestamp(rolloutDate, "17:00"),
        window_end: phoenixTimestamp(rolloutDate, "22:00"),
      },
      {
        property_id: schedule.property_id,
        cycle_id: cycle.id,
        task_type: "return",
        status: "scheduled",
        window_start: phoenixTimestamp(collectionDate, "12:00"),
        window_end: phoenixTimestamp(collectionDate, "21:00"),
      },
    ]);
    if (tasksError) throw new Error(`Task creation failed: ${tasksError.message}`);
    result.tasksCreated += 2;
  }

  return result;
}
