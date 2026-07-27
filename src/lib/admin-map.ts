import "server-only";

import type { CellGeometry } from "@/lib/geo";
import type { RouteCellState } from "@/lib/route-cell-labels";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getActiveMrrByCellId } from "@/lib/reports";

export interface AdminRouteCellMapRow {
  id: string;
  name: string;
  slug: string;
  state: RouteCellState;
  geometry: CellGeometry | null;
  centerLatitude: number | null;
  centerLongitude: number | null;
  capacity: number | null;
  activeProperties: number;
  monthlyRecurringCents: number;
}

export interface AdminRouteCellMapData {
  cells: AdminRouteCellMapRow[];
  unassignedMonthlyRecurringCents: number;
}

/**
 * Route cells with geo fields for map rendering plus the same
 * active-property/MRR economics `getRouteCellReports` computes — kept as one
 * shared aggregation (`getActiveMrrByCellId`) so the two never drift.
 */
export async function getAdminRouteCellMapData(): Promise<AdminRouteCellMapData> {
  const supabase = createSupabaseAdminClient();

  const { data: cells } = await supabase
    .from("route_cells")
    .select("id, name, slug, state, geometry, center_latitude, center_longitude, capacity")
    .order("name");

  const byCell = await getActiveMrrByCellId();

  const rows: AdminRouteCellMapRow[] = (cells ?? []).map((cell) => {
    const entry = byCell.get(cell.id) ?? { count: 0, mrr: 0 };
    return {
      id: cell.id,
      name: cell.name,
      slug: cell.slug,
      state: cell.state as RouteCellState,
      geometry: cell.geometry as CellGeometry | null,
      centerLatitude: cell.center_latitude,
      centerLongitude: cell.center_longitude,
      capacity: cell.capacity,
      activeProperties: entry.count,
      monthlyRecurringCents: entry.mrr,
    };
  });

  return {
    cells: rows,
    unassignedMonthlyRecurringCents: byCell.get(null)?.mrr ?? 0,
  };
}

export type AdminPropertyStatus = "pending_review" | "active" | "paused" | "declined" | "closed";

export interface AdminPropertyPin {
  id: string;
  addressLine1: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  status: AdminPropertyStatus;
  routeCellId: string | null;
  accountName: string;
  accountType: "individual" | "household" | "hoa" | "portfolio";
}

/** Every property across every account, for the admin ops map/search — not customer-scoped. */
export async function getAdminPropertyPins(): Promise<AdminPropertyPin[]> {
  const supabase = createSupabaseAdminClient();

  const { data } = await supabase
    .from("properties")
    .select("id, address_line1, city, latitude, longitude, status, route_cell_id, accounts(name, account_type)")
    .order("address_line1");

  return (data ?? []).map((row) => {
    const account = Array.isArray(row.accounts) ? row.accounts[0] : row.accounts;
    return {
      id: row.id,
      addressLine1: row.address_line1,
      city: row.city,
      latitude: row.latitude,
      longitude: row.longitude,
      status: row.status as AdminPropertyStatus,
      routeCellId: row.route_cell_id,
      accountName: account?.name ?? "—",
      accountType: (account?.account_type ?? "individual") as AdminPropertyPin["accountType"],
    };
  });
}
