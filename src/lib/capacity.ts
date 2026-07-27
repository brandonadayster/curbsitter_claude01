import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Active-route + capacity gate for CurbSitter onDemand (D-020 / ONE_TIME rules):
 * only accept inside an active route cell that still has capacity. Prevents a
 * growth add-on from creating work on an unserviceable or full route
 * (Phase 6 exit criterion).
 */
export interface CapacityCheck {
  ok: boolean;
  reason?: "no_eligibility" | "not_active_route" | "at_capacity";
}

export async function checkOneTimeCapacity(eligibilityCheckId: string | null): Promise<CapacityCheck> {
  if (!eligibilityCheckId) return { ok: false, reason: "no_eligibility" };

  const supabase = createSupabaseAdminClient();
  const { data: check } = await supabase
    .from("eligibility_checks")
    .select("result, route_cell_id")
    .eq("id", eligibilityCheckId)
    .maybeSingle();

  // Must have resolved to an active, available route cell.
  if (!check || check.result !== "active_available" || !check.route_cell_id) {
    return { ok: false, reason: "not_active_route" };
  }

  const { data: cell } = await supabase
    .from("route_cells")
    .select("state, capacity")
    .eq("id", check.route_cell_id)
    .maybeSingle();
  if (!cell || cell.state !== "active") {
    return { ok: false, reason: "not_active_route" };
  }

  // If a capacity is configured, count committed properties in the cell.
  if (cell.capacity !== null) {
    const { count } = await supabase
      .from("properties")
      .select("id", { count: "exact", head: true })
      .eq("route_cell_id", check.route_cell_id)
      .in("status", ["active", "pending_review"]);
    if ((count ?? 0) >= cell.capacity) {
      return { ok: false, reason: "at_capacity" };
    }
  }

  return { ok: true };
}
