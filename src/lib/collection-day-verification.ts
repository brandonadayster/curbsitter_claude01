import "server-only";

import { pointInCellGeometry } from "@/lib/geo";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * D-025: cross-check a customer's stated trash-collection weekday against
 * the City of Prescott's cached route-day zones (synced by
 * scripts/sync-city-route-days.mjs into city_route_day_zones — this reads
 * our cache only, never the live ArcGIS endpoint, per D-025's "not queried
 * live per signup" requirement).
 *
 * A point outside all zones is common and expected, not an error — it very
 * likely means the property is on a private hauler rather than City
 * service (HOAs and part of CurbSitter's own addressable market), so it's
 * a distinct outcome from a real conflict, not a failure.
 */

export type CollectionDayVerification =
  | { status: "match"; cityWeekday: number }
  | { status: "mismatch"; cityWeekday: number }
  | { status: "no_zone_data" };

/**
 * Persisted onto onboarding_drafts.collection_day_check by the
 * collection-day-check API route, and read once by finalizeOnboardingDraft.
 * `mismatch` (pending) and `mismatch_confirmed` (the customer explicitly
 * kept their own answer) are distinct — only `match` and `no_zone_data` are
 * auto-approve-eligible.
 */
export interface CollectionDayCheck {
  status: "match" | "mismatch" | "mismatch_confirmed" | "no_zone_data" | "geocode_failed";
  customerWeekday: number;
  cityWeekday: number | null;
  checkedAt: string;
}

export async function verifyCollectionDay(
  latitude: number,
  longitude: number,
  customerWeekday: number,
): Promise<CollectionDayVerification> {
  const supabase = createSupabaseAdminClient();
  const { data: zones, error } = await supabase
    .from("city_route_day_zones")
    .select("day_of_service, geometry");
  if (error) {
    throw new Error(`City route-day zone lookup failed: ${error.message}`);
  }

  const hit = (zones ?? []).find((zone) => pointInCellGeometry(longitude, latitude, zone.geometry));
  if (!hit || hit.day_of_service === null) return { status: "no_zone_data" };

  return hit.day_of_service === customerWeekday
    ? { status: "match", cityWeekday: hit.day_of_service }
    : { status: "mismatch", cityWeekday: hit.day_of_service };
}
