# Session handoff — next up: map layers + route/coverage data

**Date:** 2026-08-05
**Main is at:** `4e2c062` (merge of PR #13). Everything from the last session is **merged and main CI is green**.
**Start from:** a fresh branch off `main`. The `claude/d-027-continuation-67fcdc` branch and worktree are merged and safe to delete.

Prior work is fully recorded in `TODO.md` and `DECISION_REGISTER.md` (D-024 … D-027) — read those, not a summary here. This doc only carries what those don't.

---

## 1. Where things actually stand

D-024/025/026/027 are done. Onboarding now: address → City day lookup at stage 1 → clean signups auto-activate at payment → customer sees a real first-pickup date with a 2-day floor. Admin review only ever holds items with a stated reason.

**Not yet built, and the owner named these as next:** route map layers (this doc), dashboards, runner app polish.

## 2. The new request — multiple map layers

Owner wants these layers, and as the **first deliverable**, residential property counts per collection-day polygon.

I researched feasibility live this session. Findings below are verified against the real services, not assumed.

### The headline answer (already obtained — verified 2026-08-05)

Residential parcels intersecting the City's 16 collection-day zones:

| Collection day | Residential parcels |
|---|---|
| Monday | 5,197 |
| Tuesday | 6,573 |
| Wednesday | 5,966 |
| Thursday | 4,506 |
| **Total** | **22,242** |

Per-zone (the "singular polygon" number the owner asked for), zone `OBJECTID` → count:
Mon: 3,632 / 1,374 / 157 / 34 · Tue: 2,970 / 2,303 / 1,229 / 71 · Wed: 3,849 / 1,041 / 654 / 420 / 1 / 1 · Thu: 2,723 / 1,783

**Three things to know about these numbers before quoting them to anyone:**
1. **There is no Friday collection day.** The City runs Mon–Thu only. Any UI, capacity model, or route plan assuming a 5-day week is wrong.
2. They're `esriSpatialRelIntersects` counts, so a parcel straddling a zone border is counted in both. Total is 22,242 vs 22,113 residential parcels in the layer — **~129 double-counted**. For an exact figure, do centroid point-in-polygon (we already have `pointInCellGeometry` in `src/lib/geo.ts`).
3. "Residential" = the same `USAGE_TYPE` set `src/lib/property-usage-check.ts` uses (`Residential`, `Duplex`, `Triplex`, `Mobile Home`, `MH Affixed`). Deliberately excludes `Multi-Res` and `MH/RV Park`. Change that set and these numbers change.

**To reproduce / recompute:** `GET` layer 3 with `outFields=*&returnGeometry=true&outSR=4326&f=json` for the 16 zones, then for each zone `POST` to layer 4's `/query` with that zone's `rings` as `geometry`, `geometryType=esriGeometryPolygon`, `inSR=4326`, `spatialRel=esriSpatialRelIntersects`, `returnCountOnly=true`, and `where=USAGE_TYPE IN ('Residential','Duplex','Triplex','Mobile Home','MH Affixed')`. Layer 4 reports `supportsStatistics: true` and `supportsPagination: true` with `maxRecordCount: 2000`, so a full 47,896-parcel ingestion is also viable in ~24 pages if we want the join done locally instead.

### Layer-by-layer feasibility

The City service we already use has **more layers than we knew**:
`services5.arcgis.com/A6QJYdVM7iLWspvE/.../Solid_Waste_Route_Days/FeatureServer`
→ `0 Address` · `1 Streets` · `2 Major Streets` · `3 Current_Day` · `4 Parcels` · `5 Prescott City Limits`

1. **City of Prescott collection days** — *done.* Layer 3, already synced into `city_route_day_zones` (16 polygons) by `scripts/sync-city-route-days.mjs`. Nothing new needed to map it.
2. **City/county boundaries** — Prescott City Limits is layer 5, free. **Yavapai County and the other towns (Prescott Valley, Chino Valley, Dewey-Humboldt) are NOT in this service** and need a county source. `YavapaiCountyGIS` and `yavgis_developers` do publish public ArcGIS feature services (confirmed they exist), but I did not find the specific jurisdiction-boundary layer — that's a focused search for next session.
3. **Subdivisions** — **already available at zero cost**: `Parcels.SUBNAME` is a subdivision name on every parcel. No new source needed for Prescott. Boundaries can be derived by dissolving parcels on `SUBNAME`, or just used as an attribute/filter.
4. **HOA / condo associations** — **no HOA field exists** in the parcel data. `SUBNAME` is the closest proxy and is not the same thing. A real source would be the AZ Corporation Commission HOA registry — worth checking, but treat it as unverified until someone does.
5. **Vacation rentals** — the owner's instinct is right: **nothing in parcel data identifies these.** The realistic avenue is municipal short-term-rental permit registries (AZ requires STR registration), not GIS. Unverified — do not promise this layer until a real source is confirmed.

### My answer to "all county, or Prescott only?" (owner asked)

**Start Prescott-only, and it costs nothing to do so.** The parcel layer we already query appears scoped to the City service area — essentially all 22,113 of its residential parcels fall inside the 16 City collection zones, which is not what a county-wide layer would look like. So Prescott subdivisions are free today; county-wide subdivisions need the county parcel source that doesn't exist in our stack yet (that's PP-11, below). Doing Prescott first also puts a real layer in front of the owner in one session instead of blocking on a data-ingestion project.

The county boundary itself (layer 2) is worth doing early and separately, because it gates the **waitlist eligibility rule** the owner described: Yavapai County residents, plus anyone within **2 miles of the county line**. That 2-mile buffer is a real geometry operation, not a filter — note there's a `buffer_tool` available in the Mapbox MCP server if useful.

## 3. Traps and gaps that will bite the next session

- **No Mapbox token in `.env.local`.** `geocode()` returns null, so fresh addresses hit `geocode_failed`. Every map component in `src/components/map/` is therefore unverified in the browser. **This is the single biggest blocker for map work — get a token first.** Seeded fixture to work around it for non-map paths: `eligibility_checks` id `11ef9ae2-edad-4898-bd68-c71002475809` (133 S Cortez St, City day = Thursday).
- **`Day_of_Service` is a day *name* string ("Thursday"), not a number.** `scripts/sync-city-route-days.mjs` hard-fails on anything else. Also, the zone layer has several confusable fields — `FID_current_day_dissolve`, `PreviousDay`, `FID_ProposedDayBoundaries`, `DayChange`. I initially read the wrong one and produced plausible-but-wrong day labels. **Match `Day_of_Service` exactly.**
- **`PreviousDay` / `DayChange` exist**, which means the City has changed collection days before. Our monthly sync will silently pick up a change. Nobody has decided what happens to an existing customer whose day moves.
- **Geometry is `jsonb`, not PostGIS** (`route_cells.geometry`, `city_route_day_zones.geometry`) — deliberate for MVP. Point-in-polygon is `pointInCellGeometry` in JS. A 22k-parcel spatial join is fine as a batch job; it is not something to run per-request.
- **A heatmap was explicitly rejected** in `docs/adr/0002` in favour of native Mapbox GL clustering (PP-07). Don't reintroduce it.
- **PP-11** (Yavapai County parcel ingestion into `route_cells.geometry`) is the real prerequisite for county-wide anything, and is plan-mode gated.
- **City ArcGIS reuse terms are still unconfirmed** with City of Prescott Solid Waste. We now lean on this service for onboarding *and* would lean on it for maps. Worth resolving before it's load-bearing in production.
- **Do not revisit WM (Waste Management) scraping.** Investigated and rejected last session; recorded as D-025a. Their API is access-controlled (401 without an Okta token), keyed by Google Place ID, and returns third-party customer account records. Not without documented granted access.

## 4. Placeholders still awaiting a real number

- `ACCESS_SECRET_MIN_LENGTH = 10` — arbitrary, never confirmed.
- HOA/Enterprise property-count threshold ("5 or 10 properties") — **not coded anywhere**; `COMMUNITY_PORTFOLIO` only has `pricing: custom_quote`.

## 5. Known-broken / accepted

- **`tests/integration/referrals.test.ts:84`** expects `1000`, `business.ts` says `2000` (D-014 reverted to $20 on 2026-07-31, test never updated). Fails every run. Pre-existing, tracked as `task_5db3b98d`. **Don't chase it — but it does mean "1 failed" is the expected clean state**, so don't assume you broke something.
- **Task screen doesn't refresh its proof indicator after a background photo-queue drain.** Real UX gap, found while fixing the queue; deliberately left alone. The queue itself is correct and tested.
- Holiday collection shifts are unmodelled — the City shifts days for holidays via per-holiday toggles the ArcGIS layer doesn't carry. Our synced day will be wrong those weeks.

## 6. Environment

- Local Supabase running; all migrations applied; 16 City zones cached in `city_route_day_zones`.
- `npm run sync:city-route-days` is idempotent and safe to re-run.
- Dev users, password `devpassword123`: `admin@` / `runner@` / `customer@curbsitter.test`.
- `.env.local` was copied from the `next-agenda-item-3accc3` worktree; a fresh worktree needs `npm ci` and that file.
- Dev server stopped at end of session (PP-15 standing practice).
- The GitHub Actions sync workflow still needs real prod `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` secrets before it can run.
