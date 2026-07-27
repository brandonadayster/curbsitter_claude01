import type { CellGeometry } from "@/lib/geo";

export type RouteCellRenderMode = "polygon" | "marker" | "omit";

export interface RouteCellGeoInput {
  geometry: CellGeometry | null;
  centerLatitude: number | null;
  centerLongitude: number | null;
}

/**
 * Picks how a route cell should render on the map: a filled polygon when real
 * boundary geometry exists, a labeled marker at its admin-set center point as
 * a fallback, or omitted from the map layer entirely (it still appears in the
 * page's accessible text list — the map never has information the list lacks).
 */
export function pickRouteCellRenderMode(cell: RouteCellGeoInput): RouteCellRenderMode {
  if (cell.geometry) return "polygon";
  if (cell.centerLatitude !== null && cell.centerLongitude !== null) return "marker";
  return "omit";
}

/** Prescott, AZ — the launch market center, used as the map's default view. */
export const DEFAULT_MAP_CENTER = { longitude: -112.4685, latitude: 34.54, zoom: 10 };
