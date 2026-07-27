-- Add an admin-set center point to route_cells for map display.
--
-- `geometry` (GeoJSON Polygon/MultiPolygon) is the eventual source of truth for
-- a cell's real boundary, but no cell has one authored yet. Center point is a
-- lightweight fallback so the map can show a labeled marker before real
-- boundary data exists — never an individual customer/property location, only
-- a coarse per-cell centroid an admin sets manually.

alter table public.route_cells
  add column center_latitude double precision,
  add column center_longitude double precision;

alter table public.route_cells
  add constraint route_cells_center_lat_check
    check (center_latitude is null or center_latitude between -90 and 90),
  add constraint route_cells_center_lng_check
    check (center_longitude is null or center_longitude between -180 and 180);
