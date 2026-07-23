import "server-only";

import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { pointInCellGeometry } from "@/lib/geo";

/**
 * Route-cell / address qualification (PROJECT_TRUTH.md launch-market rules).
 *
 * An `active_available` result can only come from a geocoded address landing
 * inside an active route cell with capacity — never from a zip code alone
 * (SERVICE_AREA.zipOnlyValidationProhibited). Zip prefixes are used solely to
 * bucket non-active outcomes into waitlist vs. expansion-interest messaging.
 */

export const addressCheckSchema = z.object({
  addressLine1: z.string().trim().min(4, "Enter your street address."),
  unit: z.string().trim().max(40).optional(),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{5}$/, "Enter a 5-digit ZIP code."),
  referralCode: z.string().trim().max(24).optional(),
});

export type AddressCheckInput = z.infer<typeof addressCheckSchema>;

export type EligibilityResult =
  | "active_available"
  | "active_review_required"
  | "waitlist"
  | "capacity_full"
  | "unavailable";

export interface EligibilityOutcome {
  checkId: string;
  result: EligibilityResult;
  message: string;
  routeCell: { name: string; slug: string; state: string } | null;
}

/** Prescott city zips — launch waitlist market. */
const PRESCOTT_ZIPS = new Set(["86301", "86302", "86303", "86304", "86305", "86313"]);

/** Nearby Yavapai County zips — expansion/waitlist markets per PROJECT_TRUTH.md. */
const EXPANSION_ZIPS = new Set([
  "86312", "86314", "86315", // Prescott Valley
  "86323", // Chino Valley
  "86327", "86329", // Dewey-Humboldt
  "86333", "86334", // Mayer, Paulden
]);

interface GeocodeHit {
  normalizedAddress: string;
  latitude: number;
  longitude: number;
  placeId: string;
  confidence: string;
}

async function geocode(input: AddressCheckInput): Promise<GeocodeHit | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? process.env.NEXT_PUBLIC_MAPS_TOKEN;
  if (!token) return null;

  const query = encodeURIComponent(`${input.addressLine1}, Prescott area AZ ${input.postalCode}`);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${token}&country=us&limit=1&types=address`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      features?: Array<{
        id: string;
        place_name: string;
        center: [number, number];
        relevance: number;
      }>;
    };
    const feature = data.features?.[0];
    if (!feature) return null;
    return {
      normalizedAddress: feature.place_name,
      longitude: feature.center[0],
      latitude: feature.center[1],
      placeId: feature.id,
      confidence: feature.relevance >= 0.9 ? "high" : "medium",
    };
  } catch {
    // Geocoding is best-effort; qualification falls back to non-active outcomes.
    return null;
  }
}

export async function checkAddressEligibility(
  input: AddressCheckInput,
): Promise<EligibilityOutcome> {
  const supabase = createSupabaseAdminClient();
  const geocoded = await geocode(input);

  const { data: cells, error: cellsError } = await supabase
    .from("route_cells")
    .select("id, name, slug, state, geometry, capacity")
    .in("state", ["active", "opening", "capacity_full", "waitlist"]);

  if (cellsError) {
    throw new Error(`Route-cell lookup failed: ${cellsError.message}`);
  }

  let result: EligibilityResult;
  let reason: string;
  let matchedCell: { id: string; name: string; slug: string; state: string } | null = null;

  if (geocoded) {
    const hit = (cells ?? []).find((cell) =>
      pointInCellGeometry(geocoded.longitude, geocoded.latitude, cell.geometry),
    );
    if (hit) matchedCell = hit;
  }

  if (matchedCell?.state === "active") {
    result = "active_available";
    reason = "address_in_active_cell";
  } else if (matchedCell?.state === "capacity_full") {
    result = "capacity_full";
    reason = "cell_at_capacity";
  } else if (matchedCell) {
    result = "waitlist";
    reason = `cell_${matchedCell.state}`;
  } else if (PRESCOTT_ZIPS.has(input.postalCode)) {
    result = "waitlist";
    reason = "prescott_launch_market_no_active_cell";
  } else if (EXPANSION_ZIPS.has(input.postalCode)) {
    result = "waitlist";
    reason = "expansion_market";
  } else {
    result = "unavailable";
    reason = "outside_service_region";
  }

  const { data: check, error: insertError } = await supabase
    .from("eligibility_checks")
    .insert({
      submitted_address: `${input.addressLine1}${input.unit ? `, ${input.unit}` : ""}`,
      normalized_address: geocoded?.normalizedAddress ?? null,
      postal_code: input.postalCode,
      place_id: geocoded?.placeId ?? null,
      latitude: geocoded?.latitude ?? null,
      longitude: geocoded?.longitude ?? null,
      result,
      reason,
      route_cell_id: matchedCell?.id ?? null,
      referral_code: input.referralCode ?? null,
    })
    .select("id")
    .single();

  if (insertError || !check) {
    throw new Error(`Could not record eligibility check: ${insertError?.message}`);
  }

  const messages: Record<EligibilityResult, string> = {
    active_available:
      "Good news — your address is inside an active route. You can continue to plan selection.",
    active_review_required:
      "Your address is inside an active route but needs a quick property review before we confirm service.",
    waitlist:
      "We're launching route by route in the Prescott area, and your street isn't on an active route yet. Join the waitlist and we'll contact you as your route opens.",
    capacity_full:
      "Your route is currently at capacity. Join the priority list and we'll reach out as spots open.",
    unavailable:
      "CurbSitter doesn't serve this area yet. Leave your email and we'll let you know if that changes.",
  };

  return {
    checkId: check.id,
    result,
    message: messages[result],
    routeCell: matchedCell
      ? { name: matchedCell.name, slug: matchedCell.slug, state: matchedCell.state }
      : null,
  };
}
