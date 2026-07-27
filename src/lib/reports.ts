import "server-only";

import { PLANS, getPlanPriceCents, type BillingInterval, type PlanId } from "@/config/business";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Route/cell KPI inputs (METRICS section of the Bible). These are operational
 * reliability and economics *inputs* — not fabricated public metrics (D-015).
 */

export interface ReliabilityKpis {
  totalCycles: number;
  completed: number;
  completedWithException: number;
  delayedByHauler: number;
  blocked: number;
  proofRatePct: number; // cycles with both rollout+return proof / terminal cycles
  openExceptions: number;
}

export interface RouteCellReport {
  cellId: string | null;
  name: string;
  state: string;
  activeProperties: number;
  monthlyRecurringCents: number;
}

export interface ExceptionBucket {
  type: string;
  count: number;
}

export async function getReliabilityKpis(): Promise<ReliabilityKpis> {
  const supabase = createSupabaseAdminClient();

  const { data: cycles } = await supabase.from("collection_cycles").select("id, state");
  const rows = cycles ?? [];
  const completed = rows.filter((c) => c.state === "completed").length;
  const completedWithException = rows.filter((c) => c.state === "completed_with_exception").length;
  const delayedByHauler = rows.filter((c) => c.state === "delayed_by_hauler").length;
  const blocked = rows.filter((c) => c.state === "blocked").length;

  // Proof rate: of cycles that reached a terminal state, how many have both
  // a rollout and a return proof photo.
  const terminalStates = new Set(["completed", "completed_with_exception"]);
  const terminalCycleIds = rows.filter((c) => terminalStates.has(c.state)).map((c) => c.id);
  let proofRatePct = 100;
  if (terminalCycleIds.length > 0) {
    const { data: tasks } = await supabase
      .from("service_tasks")
      .select("cycle_id, task_type, service_photos(photo_type)")
      .in("cycle_id", terminalCycleIds);
    const byCycle = new Map<string, Set<string>>();
    for (const task of tasks ?? []) {
      if (!task.cycle_id) continue;
      const set = byCycle.get(task.cycle_id) ?? new Set<string>();
      for (const photo of task.service_photos ?? []) set.add(photo.photo_type);
      byCycle.set(task.cycle_id, set);
    }
    const withBoth = terminalCycleIds.filter((id) => {
      const set = byCycle.get(id);
      return set?.has("rollout_proof") && set?.has("return_proof");
    }).length;
    proofRatePct = Math.round((withBoth / terminalCycleIds.length) * 100);
  }

  const { count: openExceptions } = await supabase
    .from("exceptions")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");

  return {
    totalCycles: rows.length,
    completed,
    completedWithException,
    delayedByHauler,
    blocked,
    proofRatePct,
    openExceptions: openExceptions ?? 0,
  };
}

export async function getExceptionBuckets(): Promise<ExceptionBucket[]> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.from("exceptions").select("exception_type");
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.exception_type, (counts.get(row.exception_type) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

/** Active subscriptions aggregated by their property's route cell (null = unassigned). */
export async function getActiveMrrByCellId(): Promise<Map<string | null, { count: number; mrr: number }>> {
  const supabase = createSupabaseAdminClient();

  const { data: subs } = await supabase
    .from("subscriptions")
    .select("plan_id, billing_interval, status, properties(route_cell_id)")
    .eq("status", "active");

  const byCell = new Map<string | null, { count: number; mrr: number }>();
  for (const sub of subs ?? []) {
    const property = Array.isArray(sub.properties) ? sub.properties[0] : sub.properties;
    const cellId = property?.route_cell_id ?? null;
    const monthly = monthlyEquivalentCents(sub.plan_id as PlanId, sub.billing_interval as BillingInterval);
    const entry = byCell.get(cellId) ?? { count: 0, mrr: 0 };
    entry.count += 1;
    entry.mrr += monthly;
    byCell.set(cellId, entry);
  }

  return byCell;
}

export async function getRouteCellReports(): Promise<RouteCellReport[]> {
  const supabase = createSupabaseAdminClient();

  const { data: cells } = await supabase
    .from("route_cells")
    .select("id, name, state")
    .order("name");

  const byCell = await getActiveMrrByCellId();

  const reports: RouteCellReport[] = (cells ?? []).map((cell) => {
    const entry = byCell.get(cell.id) ?? { count: 0, mrr: 0 };
    return {
      cellId: cell.id,
      name: cell.name,
      state: cell.state,
      activeProperties: entry.count,
      monthlyRecurringCents: entry.mrr,
    };
  });

  // Any active subs not mapped to a known cell.
  const unmapped = byCell.get(null);
  if (unmapped && unmapped.count > 0) {
    reports.push({
      cellId: null,
      name: "Unassigned to a route cell",
      state: "—",
      activeProperties: unmapped.count,
      monthlyRecurringCents: unmapped.mrr,
    });
  }

  return reports;
}

/** Normalize quarterly prepay to a monthly-equivalent for MRR reporting. */
function monthlyEquivalentCents(planId: PlanId, interval: BillingInterval): number {
  if (!PLANS[planId]) return 0;
  const price = getPlanPriceCents(planId, interval);
  return interval === "quarterly" ? Math.round(price / 3) : price;
}
