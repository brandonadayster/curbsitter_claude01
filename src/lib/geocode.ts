import "server-only";

/**
 * Mapbox forward geocoding. Extracted from eligibility.ts (its original and
 * still primary caller) so collection-day verification and the residential
 * parcel check can share it without duplicating the fetch/timeout/parsing
 * logic or eligibility.ts's route-cell-specific concerns.
 */

export interface GeocodeInput {
  addressLine1: string;
  postalCode: string;
}

export interface GeocodeHit {
  normalizedAddress: string;
  latitude: number;
  longitude: number;
  placeId: string;
  confidence: string;
}

/**
 * Mapbox Geocoding v6 forward-geocoding response shape (the fields this
 * function reads). v5 (`/geocoding/v5/mapbox.places/`) is deprecated; v6
 * moves the coordinate/address/id fields into `properties` and replaces the
 * old 0-1 `relevance` score with a `match_code.confidence` enum.
 * https://docs.mapbox.com/api/search/geocoding/#geocoding-response-object
 */
interface GeocodeV6Response {
  features?: Array<{
    properties: {
      mapbox_id: string;
      full_address?: string;
      place_formatted?: string;
      coordinates: { longitude: number; latitude: number };
      match_code?: { confidence?: "exact" | "high" | "medium" | "low" };
    };
  }>;
}

export async function geocode(input: GeocodeInput): Promise<GeocodeHit | null> {
  // `MAPBOX_SERVER_TOKEN` first, and it is not `NEXT_PUBLIC_` on purpose.
  //
  // Every caller of this function runs server-side, where there is no
  // `Referer` header — so a URL-restricted token (the correct kind to ship in
  // the browser bundle for map tiles) is rejected with 403 here. The two uses
  // genuinely need different tokens: restricted for the client, unrestricted
  // for the server. The public vars stay as a fallback so an unrestricted
  // single-token setup keeps working.
  const token =
    process.env.MAPBOX_SERVER_TOKEN ??
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN ??
    process.env.NEXT_PUBLIC_MAPS_TOKEN;
  if (!token) return null;

  const query = encodeURIComponent(`${input.addressLine1}, Prescott area AZ ${input.postalCode}`);
  // `permanent=true`: the result is persisted indefinitely (eligibility_checks,
  // properties, and now onboarding_drafts' verification records), not just
  // displayed transiently, so this must be a permanent geocode under
  // Mapbox's storage terms.
  const url =
    `https://api.mapbox.com/search/geocode/v6/forward?q=${query}` +
    `&access_token=${token}&country=us&limit=1&types=address&permanent=true`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    const data = (await response.json()) as GeocodeV6Response;
    const feature = data.features?.[0];
    if (!feature) return null;
    const { properties } = feature;
    return {
      normalizedAddress: properties.full_address ?? properties.place_formatted ?? input.addressLine1,
      longitude: properties.coordinates.longitude,
      latitude: properties.coordinates.latitude,
      placeId: properties.mapbox_id,
      confidence: properties.match_code?.confidence ?? "unknown",
    };
  } catch {
    // Geocoding is best-effort; callers fall back to their own non-active outcomes.
    return null;
  }
}
