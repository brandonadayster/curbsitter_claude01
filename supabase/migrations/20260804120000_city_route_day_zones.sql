-- Local cache of the City of Prescott's public "Solid Waste Route Days"
-- ArcGIS feature service (Current_Day layer), synced on a schedule by
-- scripts/sync-city-route-days.mjs rather than queried live per signup.
--
-- Standalone reference table, no FK into existing tables. Service-role only:
-- never read from a customer- or admin-authenticated session, same posture
-- as property_access_secrets.

create table public.city_route_day_zones (
  id uuid primary key default gen_random_uuid(),
  source_feature_id text not null,
  day_of_service smallint check (day_of_service between 0 and 6),
  -- GeoJSON Polygon/MultiPolygon, same shape route_cells.geometry already
  -- uses, fetched pre-reprojected to WGS84 (outSR=4326) so no coordinate
  -- transform is needed on read.
  geometry jsonb not null,
  raw_properties jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index city_route_day_zones_feature_idx
  on public.city_route_day_zones (source_feature_id);

alter table public.city_route_day_zones enable row level security;
-- No policies: written only by the sync script's service-role client, read
-- only by src/lib/collection-day-verification.ts's server-only admin client.
