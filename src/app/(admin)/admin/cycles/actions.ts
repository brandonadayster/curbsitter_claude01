"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auditLog } from "@/lib/audit";
import { assertRole } from "@/lib/auth";
import { generateCyclesForDate } from "@/lib/cycles";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");

export async function generateCycles(formData: FormData): Promise<void> {
  const session = await assertRole(["admin", "dispatcher"]);
  const date = dateSchema.parse(formData.get("collectionDate"));

  const result = await generateCyclesForDate(date);

  await auditLog({
    actorId: session.userId,
    action: "cycles.generate",
    entity: "collection_cycles",
    entityId: date,
    after: { ...result },
  });

  revalidatePath("/admin/cycles");
}

const assignSchema = z.object({
  routeDate: dateSchema,
  taskType: z.enum(["rollout", "return"]),
  runnerId: z.string().uuid(),
});

/**
 * Manual route building (D-011): create a published route for a date/type,
 * attach every unassigned scheduled task of that type whose window falls on
 * the date, in address order, and assign the runner.
 */
export async function buildAndAssignRoute(formData: FormData): Promise<void> {
  const session = await assertRole(["admin", "dispatcher"]);
  const parsed = assignSchema.safeParse({
    routeDate: formData.get("routeDate"),
    taskType: formData.get("taskType"),
    runnerId: formData.get("runnerId"),
  });
  if (!parsed.success) throw new Error("Invalid route assignment.");

  const supabase = createSupabaseAdminClient();

  // Tasks of this type whose service window is on the route date (Phoenix).
  const dayStart = `${parsed.data.routeDate}T00:00:00-07:00`;
  const dayEnd = `${parsed.data.routeDate}T23:59:59-07:00`;
  const { data: tasks, error: tasksError } = await supabase
    .from("service_tasks")
    .select("id, property_id, properties(address_line1)")
    .eq("task_type", parsed.data.taskType)
    .eq("status", "scheduled")
    .is("route_id", null)
    .gte("window_start", dayStart)
    .lte("window_start", dayEnd);
  if (tasksError) throw new Error(`Task lookup failed: ${tasksError.message}`);
  if (!tasks || tasks.length === 0) {
    throw new Error("No unassigned scheduled tasks found for that date and type.");
  }

  const { data: route, error: routeError } = await supabase
    .from("routes")
    .insert({
      route_date: parsed.data.routeDate,
      task_type: parsed.data.taskType,
      runner_id: parsed.data.runnerId,
      status: "published",
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (routeError || !route) throw new Error(`Route creation failed: ${routeError?.message}`);

  const ordered = [...tasks].sort((a, b) => {
    const addressA = (Array.isArray(a.properties) ? a.properties[0] : a.properties)?.address_line1 ?? "";
    const addressB = (Array.isArray(b.properties) ? b.properties[0] : b.properties)?.address_line1 ?? "";
    return addressA.localeCompare(addressB);
  });

  for (const [index, task] of ordered.entries()) {
    const { error: updateError } = await supabase
      .from("service_tasks")
      .update({
        route_id: route.id,
        sequence: index + 1,
        status: "assigned",
        assigned_runner_id: parsed.data.runnerId,
      })
      .eq("id", task.id)
      .eq("status", "scheduled");
    if (updateError) throw new Error(`Task assignment failed: ${updateError.message}`);

    await supabase.from("task_events").insert({
      task_id: task.id,
      event_type: "status:assigned",
      from_status: "scheduled",
      to_status: "assigned",
      actor_id: session.userId,
      payload: { route_id: route.id, sequence: index + 1 },
    });
  }

  await auditLog({
    actorId: session.userId,
    action: "route.build_and_assign",
    entity: "routes",
    entityId: route.id,
    after: {
      route_date: parsed.data.routeDate,
      task_type: parsed.data.taskType,
      runner_id: parsed.data.runnerId,
      task_count: ordered.length,
    },
  });

  revalidatePath("/admin/cycles");
}
