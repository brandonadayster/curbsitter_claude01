import "server-only";

/**
 * D-027: the one fact about a property that's genuinely verifiable without
 * a site visit — is it actually residential — checked against Yavapai
 * County assessor parcel data, surfaced via the same City-hosted ArcGIS
 * group D-025 already uses (Solid_Waste_Route_Days/FeatureServer/4,
 * "Parcels").
 *
 * Live, not cached, deliberately: unlike the 16-polygon route-day layer,
 * county parcels number in the thousands — caching the whole layer for a
 * per-address lookup would be disproportionate. A single spatial query per
 * signup is the right shape here, the same way Mapbox geocoding itself is
 * a live per-request call, not pre-cached.
 *
 * USAGE_TYPE values confirmed live against the real service (24 distinct
 * values). Anything not explicitly listed as residential — including any
 * future/unrecognized value — fails safe to "flagged", never to
 * "residential".
 */

const PARCELS_QUERY_URL =
  "https://services5.arcgis.com/A6QJYdVM7iLWspvE/arcgis/rest/services/" +
  "Solid_Waste_Route_Days/FeatureServer/4/query";

// Duplex/Triplex/Mobile Home/MH Affixed are small residential dwellings.
// Multi-Res and MH/RV Park are deliberately excluded: those usually mean a
// managed multi-unit property with centralized service, not a simple
// single curbside customer — worth a human glance, not an assumption.
const RESIDENTIAL_USAGE_TYPES = new Set([
  "residential",
  "duplex",
  "triplex",
  "mobile home",
  "mh affixed",
]);

interface ParcelsQueryResponse {
  error?: unknown;
  features?: Array<{ attributes?: { USAGE_TYPE?: string; USAGE_DESC?: string } }>;
}

export interface CommercialCheck {
  status: "residential" | "flagged" | "check_failed";
  usageType: string | null;
  usageDesc: string | null;
  checkedAt: string;
}

export async function checkPropertyUsage(latitude: number, longitude: number): Promise<CommercialCheck> {
  const checkedAt = new Date().toISOString();
  const url =
    `${PARCELS_QUERY_URL}?geometry=${longitude},${latitude}&geometryType=esriGeometryPoint` +
    `&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=USAGE_TYPE,USAGE_DESC` +
    `&returnGeometry=false&resultRecordCount=1&f=json`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) {
      return { status: "check_failed", usageType: null, usageDesc: null, checkedAt };
    }
    const data = (await response.json()) as ParcelsQueryResponse;
    if (data.error) {
      return { status: "check_failed", usageType: null, usageDesc: null, checkedAt };
    }
    const attributes = data.features?.[0]?.attributes;
    if (!attributes) {
      // No parcel found at this point — fail safe to "needs review", never
      // assume residential just because we couldn't check.
      return { status: "check_failed", usageType: null, usageDesc: null, checkedAt };
    }

    const usageType = attributes.USAGE_TYPE?.trim() ?? null;
    const usageDesc = attributes.USAGE_DESC?.trim() ?? null;
    const isResidential = usageType !== null && RESIDENTIAL_USAGE_TYPES.has(usageType.toLowerCase());

    return { status: isResidential ? "residential" : "flagged", usageType, usageDesc, checkedAt };
  } catch {
    // Treated as an unreliable external system (AGENTS.md) — never let a
    // timeout or network error silently become "residential".
    return { status: "check_failed", usageType: null, usageDesc: null, checkedAt };
  }
}
