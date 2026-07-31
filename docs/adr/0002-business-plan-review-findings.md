# ADR 0002 — Business-plan research document review findings

**Date:** 2026-07-31
**Status:** Accepted — owner approved 2026-07-31 ("let's go ahead and move forward with your
recommendations")

## Context

The owner supplied a third-party business/technology research document
("Curbsitter: Business + Technology Plan for a Bin-to-Curb Service in
Prescott, AZ") and asked for a usability assessment against the current
stack, focused on dashboard and mapping features. Per `AGENTS.md`, such
material is reference-only and cannot itself authorize a change to pricing,
scope, or public claims — this ADR records what the review found and what
of it the owner approved for action.

The document was written from a pre-code, Phase-0 vantage point. Most of its
architecture recommendations (Next.js/Vercel, Supabase+PostGIS, Stripe,
Mapbox, PWA-first runner app, "buy routing, don't build a solver") match
decisions already locked by D-010/D-011/D-012 and required no action.

## Findings adopted

1. **Named-polygon route cells over H3.** The document's central argument —
   model service areas as named subdivision/HOA polygons with a
   hauler×collection-day rule, not a hex grid — is the design already in
   `route_cells`/`src/lib/geo.ts`. No change; confirms D-011.
2. **`h3-js` is an unused dependency.** Zero references in `src/`. Removed
   (PP-06) — carrying it implied a backbone the codebase deliberately
   rejected.
3. **Yavapai County GIS as the source for real route-cell boundaries.**
   No `route_cells` row has authored polygon geometry yet (see
   `20260727120000_route_cells_center_point.sql`); every map currently falls
   back to admin-set center-point markers. The county's ArcGIS `Parcels`
   layer (`SUBNAME`/`SUBUNIT` fields) and Open Data portal are a free,
   concrete ingestion source. Tracked as PP-11, gated on plan mode and owner
   review before any ingested boundary is written to `route_cells.geometry`
   — this data directly gates who can subscribe (`PROJECT_TRUTH.md`
   route-density rule), so an ingestion error is a live eligibility bug, not
   a cosmetic one.
4. **Property-pin scaling on the admin map.** `admin-ops-map.tsx` rendered
   one DOM `Marker` per property. Adopted a native Mapbox GL clustering
   approach (PP-07) rather than the document's deck.gl suggestion — deck.gl
   would add a new dependency and inherit the iOS-Safari heatmap
   float-texture limitation the document itself flags, to solve a scale
   problem Mapbox GL's own `cluster` source option already handles.
5. **Deprecated geocoding endpoint.** Not raised by the document, but found
   while reviewing the same code path it discusses: `src/lib/eligibility.ts`
   called Mapbox Geocoding v5, which is deprecated. Migrated to the current
   endpoint (PP-08).
6. **Hauler × collection-day gap.** `route_cells.collection_days` is written
   at admin setup but read nowhere; eligibility only checks polygon
   containment. A mixed-hauler street can pass eligibility and only surface
   as a scheduling mismatch at admin review (which does catch it — D-018 —
   so this is a conversion/support-cost issue, not a correctness hole).
   Tracked as PP-09, gated on plan mode (new schema).
7. **No attribution column for lead capture.** `eligibility_checks` and
   `waitlist_leads` carry `referral_code` but nothing for
   channel/campaign/source, so door-hanger/QR/PPC ROI (a document
   recommendation and an existing marketing idea in `MARKETING_GROWTH.md`)
   has nowhere to land. Tracked as PP-10, gated on plan mode (schema).
8. **Admin mobile map layout.** The document's map-first + draggable
   bottom-sheet + collapsed layer toggle pattern is a genuine answer for
   `/admin/map`'s hardest breakpoint. Tracked as PP-12.
9. **Missing dashboard metrics.** Churn, LTV/CAC, and channel ROI are absent
   from `/admin/reports`. Tracked as PP-13, sequenced after PP-10 (nothing
   to chart without the attribution column).
10. **Customer-portal gaps.** Cross-checked against the document's checklist:
    self-serve reschedule and per-visit skip are the only items CurbSitter
    doesn't already have (pause/resume/cancel, history, proof photos,
    referral link, and payment management all exist per Phase 5). Tracked
    as PP-14.

## Findings explicitly rejected

- **Fuzzed/adaptive waitlist progress** (a progress bar with a `±15%`
  fuzzed denominator, a threshold that "quietly moves," rounded/delayed
  momentum counts). D-015 is locked: no fabricated counts, progress, or
  activity. A deliberately falsified denominator and a silently-moving goal
  are fabricated progress regardless of framing. The document's own
  *exact-count-for-own-referrals-only* principle is sound and already
  matches the customer referrals page — kept.
- **Bundling adjacent services** (bin cleaning, dog-waste pickup, pressure
  washing, package retrieval). Explicitly out of scope
  (`PROJECT_TRUTH.md` scope exclusions).
- **Premium off-route surcharge pricing (+50–100%)**, **ValetHero
  adoption**, and any dollar figures from the document's own unit-economics
  table (built on a ~$40/mo assumption, not CurbSitter's $65/$85 pricing).
  None of these are self-executing; each would require its own owner ADR
  under D-004/D-017.
- **Labor/classification content** (W-2 vs. 1099, AZ minimum wage, IRS
  mileage rate, hybrid pay). Substantive and likely the most valuable
  non-technical content in the document, but entirely outside the
  codebase — routed to `OPERATIONS_PLAYBOOK.md` / `OPEN_DECISIONS.md` #8 as
  an owner/counsel item, not a code ticket.

## Separately, same session

The owner reverted D-014 (referral credit amount) from Give $10/Get $10
back to the original Give $20/Get $20, unrelated to this document — the
$10/$10 amount (set 2026-07-27) had less pull than the original. See D-014
in `DECISION_REGISTER.md` and PP-05 in `TODO.md`.

## Consequences

- PP-06, PP-07, PP-08 are implemented directly in this session (no schema,
  no auth/billing/storage, single-file-scale changes).
- PP-09, PP-10, PP-11 require a schema migration and/or write real
  eligibility-affecting data, and are explicitly deferred to a plan-mode
  pass with owner review before implementation, per `CLAUDE.md` and
  `.claude/rules/database.md`.
- PP-12, PP-13, PP-14 are unscheduled follow-up tickets, not started.
