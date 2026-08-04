#!/usr/bin/env node
// Syncs the City of Prescott's public "Solid Waste Route Days" ArcGIS
// feature service (Current_Day layer) into city_route_day_zones, so
// onboarding-time collection-day verification never queries the live City
// endpoint per signup. Run monthly via .github/workflows/sync-city-route-days.yml,
// or manually: npm run sync:city-route-days
//
// Plain Node ESM, not TypeScript: scripts/ is bash-only today and there's no
// tsx/ts-node dependency to justify adding just for this. Node's built-in
// fetch (Node 24 per .nvmrc) and @supabase/supabase-js (already a
// dependency) are all this needs.

import { createClient } from "@supabase/supabase-js";

const ARCGIS_QUERY_URL =
  "https://services5.arcgis.com/A6QJYdVM7iLWspvE/arcgis/rest/services/" +
  "Solid_Waste_Route_Days/FeatureServer/3/query" +
  "?where=1=1&outFields=*&outSR=4326&f=geojson";

const DAY_NAME_TO_WEEKDAY = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function parseWeekday(dayOfService) {
  if (typeof dayOfService !== "string") return null;
  const weekday = DAY_NAME_TO_WEEKDAY[dayOfService.trim().toLowerCase()];
  return weekday === undefined ? null : weekday;
}

async function fetchZones() {
  const response = await fetch(ARCGIS_QUERY_URL, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) {
    throw new Error(`ArcGIS query returned HTTP ${response.status}`);
  }
  const data = await response.json();
  if (data.error) {
    throw new Error(`ArcGIS query returned an error: ${JSON.stringify(data.error)}`);
  }
  const features = Array.isArray(data.features) ? data.features : [];
  if (features.length === 0) {
    throw new Error("ArcGIS query returned zero features — refusing to sync an empty result.");
  }
  return features;
}

function mapFeatureToRow(feature) {
  const properties = feature.properties ?? {};
  const sourceFeatureId = properties.OBJECTID;
  if (sourceFeatureId === undefined || sourceFeatureId === null) {
    throw new Error("A feature is missing OBJECTID — refusing to sync.");
  }
  const dayOfService = parseWeekday(properties.Day_of_Service);
  if (dayOfService === null) {
    throw new Error(
      `Feature ${sourceFeatureId} has an unparseable Day_of_Service value: ${JSON.stringify(properties.Day_of_Service)}`,
    );
  }
  return {
    source_feature_id: String(sourceFeatureId),
    day_of_service: dayOfService,
    geometry: feature.geometry,
    raw_properties: properties,
  };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exitCode = 1;
    return;
  }
  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let rows;
  try {
    const features = await fetchZones();
    rows = features.map(mapFeatureToRow);
  } catch (error) {
    // Never touch the table on a failed/malformed fetch — leave whatever was
    // last successfully synced in place rather than degrade verification.
    console.error(`City route-day sync failed, table left unchanged: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  // Upsert first, delete stale rows only after the upsert succeeds — a
  // mid-run crash then leaves a stale-but-present table, never an empty one.
  const { error: upsertError } = await supabase
    .from("city_route_day_zones")
    .upsert(rows, { onConflict: "source_feature_id" });
  if (upsertError) {
    console.error(`Upsert failed, table left unchanged: ${upsertError.message}`);
    process.exitCode = 1;
    return;
  }

  const currentFeatureIds = rows.map((row) => row.source_feature_id);
  const { error: deleteError } = await supabase
    .from("city_route_day_zones")
    .delete()
    .not("source_feature_id", "in", `(${currentFeatureIds.map((id) => `"${id}"`).join(",")})`);
  if (deleteError) {
    console.error(`Stale-row cleanup failed (new rows were still written): ${deleteError.message}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Synced ${rows.length} City of Prescott route-day zones.`);
}

main();
