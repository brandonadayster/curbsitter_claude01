import "server-only";

import { pointInCellGeometry } from "@/lib/geo";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * D-025: look an address up against the City of Prescott's cached route-day
 * zones (synced by scripts/sync-city-route-days.mjs into city_route_day_zones
 * — this reads our cache only, never the live ArcGIS endpoint, per D-025's
 * "not queried live per signup" requirement).
 *
 * A point outside all zones is common and expected, not an error — it very
 * likely means the property is on a private hauler rather than City service
 * (HOAs and part of CurbSitter's own addressable market).
 */

/**
 * The raw address-vs-City-zones result, recorded at stage 1 on
 * onboarding_drafts.city_lookup before any customer day answer exists.
 */
export interface CityLookup {
  status: "found" | "not_found" | "geocode_failed";
  cityWeekday: number | null;
  checkedAt: string;
}

/**
 * The combined customer-answer + City-data outcome, recorded at stage 3 on
 * onboarding_drafts.collection_day_check and read once by
 * finalizeOnboardingDraft.
 *
 * Only `match` and `city_resolved` are treated as a verified day.
 * `mismatch` (unresolved) and `mismatch_confirmed` (the customer explicitly
 * kept their own answer) are distinct, and neither is auto-approve-eligible.
 * `unsure_no_data` — the customer doesn't know their day and the City has no
 * record for the address — proceeds to signup but needs an admin to resolve
 * the day by hand before service can be scheduled.
 */
export interface CollectionDayCheck {
  status:
    | "match"
    | "mismatch"
    | "mismatch_confirmed"
    | "no_zone_data"
    | "city_resolved"
    | "unsure_no_data"
    | "geocode_failed";
  customerWeekday: number | null;
  cityWeekday: number | null;
  checkedAt: string;
}

/**
 * Combine a stage-1 City lookup with the customer's stated day. Pure — the
 * I/O already happened at stage 1, so this is just classification.
 *
 * `customerWeekday === null` means "I'm not sure".
 */
export function combineDayCheck(
  cityLookup: CityLookup,
  customerWeekday: number | null,
  checkedAt: string,
): CollectionDayCheck {
  if (cityLookup.status === "geocode_failed") {
    return { status: "geocode_failed", customerWeekday, cityWeekday: null, checkedAt };
  }

  if (cityLookup.status === "not_found" || cityLookup.cityWeekday === null) {
    // No City record for this address — usually a private hauler. Harmless
    // when the customer knows their own day; when they don't, there's no day
    // to schedule against, so an admin resolves it before approval.
    return customerWeekday === null
      ? { status: "unsure_no_data", customerWeekday: null, cityWeekday: null, checkedAt }
      : { status: "no_zone_data", customerWeekday, cityWeekday: null, checkedAt };
  }

  const cityWeekday = cityLookup.cityWeekday;
  if (customerWeekday === null) {
    return { status: "city_resolved", customerWeekday: cityWeekday, cityWeekday, checkedAt };
  }
  return {
    status: customerWeekday === cityWeekday ? "match" : "mismatch",
    customerWeekday,
    cityWeekday,
    checkedAt,
  };
}

/** The City's collection weekday for a point, or null when it's outside every zone. */
export async function lookupCityWeekday(
  latitude: number,
  longitude: number,
): Promise<number | null> {
  const supabase = createSupabaseAdminClient();
  const { data: zones, error } = await supabase
    .from("city_route_day_zones")
    .select("day_of_service, geometry");
  if (error) {
    throw new Error(`City route-day zone lookup failed: ${error.message}`);
  }

  const hit = (zones ?? []).find((zone) => pointInCellGeometry(longitude, latitude, zone.geometry));
  return hit?.day_of_service ?? null;
}
