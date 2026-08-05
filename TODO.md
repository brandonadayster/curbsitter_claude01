# Living Execution Tracker

Status annotations added 2026-07-19 after the v1.1 kit was adopted into this
repository (branch `feature/kit-v1.1-baseline`). Unchecked items with notes are
partially complete; the note says what remains.

## Phase 0
- [x] P0-01 Confirm publication locks. *(Locked 2026-07-13 pricing adopted into `src/config/business.ts` + seed; OWNER_CONFIRM items tracked in OPEN_DECISIONS.md.)*
- [x] P0-02 Initialize repository and protections. *(Repo + feature-branch convention; GitHub branch-protection rules must be enabled in repo settings by the owner.)*
- [x] P0-03 Scaffold current stable app and pin versions. *(Existing Next 16.2.10 / React 19 app retained; `.nvmrc` 24; npm lockfile committed — see docs/adr/0001.)*
- [x] P0-04 Add CI and quality scripts. *(lint/typecheck/test/build in GitHub Actions; RLS smoke test runs locally via `scripts/test_rls.sh`.)*
- [ ] P0-05 Configure local/staging/production environments. *(Local complete incl. local Supabase; staging/production provisioning is owner-gated.)*

## Phase 1
- [x] P1-01 Create core migrations and enums. *(Migration history reset pre-production; legacy prototype schema archived in docs/archive/legacy-migrations.)*
- [x] P1-02 Implement auth roles/memberships. *(profiles + platform_role, accounts, account_members, auto-profile trigger.)*
- [x] P1-03 Implement RLS and policy tests. *(Default-deny + explicit verb grants; `scripts/test_rls.sh` proves no cross-account/runner leakage. Expand into fuller policy suite during Phase 4.)*
- [x] P1-04 Create private storage and signed URL service. *(Authorized short-lived signed URLs via /api/photos/[id]/url; uploads server-mediated to the private bucket.)*
- [x] P1-05 Isolate/encrypt access data and audit privileged actions. *(AES-256-GCM at rest, task-scoped audited reveal for assigned runners; customer step-up re-verification remains a Phase 5 item.)*

## Phase 2
- [x] P2-01 Build design tokens/public shell. *(FRONTEND_GUIDELINES tokens in globals.css, header/footer, reduced-motion, focus states.)*
- [x] P2-02 Build core marketing pages and content. *(All APP_FLOW public routes with truthful copy; legal pages are marked drafts pending counsel.)*
- [x] P2-03 Build address normalization and route-cell engine. *(Geocode + point-in-cell for active results; zip buckets only for non-active outcomes; every check recorded.)*
- [x] P2-04 Build waitlist and consent flow. *(Versioned consent rows, share codes, referral attribution, outbox-queued confirmation.)*
- [x] P2-05 Build route-cell admin. *(State/capacity management with waiting-lead counts and audit entries; public site reflects changes.)*
- [ ] P2-06 Add SEO, structured data, analytics events, and accessibility checks. *(Metadata/sitemap/robots done; structured data, analytics events, and automated axe checks remain.)*

## Phase 3
- [x] P3-01 Build four-stage onboarding. *(Draft persistence with capability token, resume, progress UI.)*
- [x] P3-02 Build contacts/payer/recipient/property/bin/schedule intake. *(Buy-for-someone-else supported; extra notification recipients UI minimal.)*
- [x] P3-03 Build secure access/hazard intake. *(Secrets split from stage data at the boundary, encrypted at rest, never echoed to the client.)*
- [x] P3-04 Build server-side pricing/config. *(`buildQuote` from typed config; complexity flags review, never a surcharge; unit-tested.)*
- [x] P3-05 Integrate Stripe and idempotent webhooks. *(Checkout for monthly card / quarterly prepaid ACH / one-time; webhook_events ledger; needs test keys in .env.local to exercise end-to-end.)*
- [x] P3-06 Create serviceability review state and communications. *(Admin review queue approves/declines with audited decisions and outbox-queued customer emails; the outbox sender worker itself is P5-05.)*

## Phase 4
- [x] P4-01 Build cycle/task generation. *(Per-date generation from verified schedules of active properties; idempotent; Phoenix service windows.)*
- [x] P4-02 Build admin review and route builder. *(Manual route build per D-011: date+type → published route, address-ordered, runner-assigned.)*
- [x] P4-03 Build runner route/task UI. *(Assigned-only stops, large controls, audited access reveal, full rollout cycle driven end-to-end 2026-07-20.)*
- [x] P4-04 Build photo capture/compression/private upload/retry. *(Camera capture → private bucket via server; server-enforced proof-before-complete; client-side compression and offline retry queue remain for pilot hardening.)*
- [x] P4-05 Build explicit state machine and event log. *(Transition table + cycle sync unit-tested; append-only task_events; idempotent completion keys.)*
- [x] P4-06 Build exception, recheck, and safety incident workflows. *(Admin triage page with resolve/retry/schedule-recheck, customer exception/hauler-delay emails via outbox, runner safety-incident reports; delayed-hauler loop verified end-to-end 2026-07-20.)*

## Phase 5
- [x] P5-01 Build customer overview and multi-property views. *(Portal shell + nav; overview with next service and per-property cards, all RLS-scoped.)*
- [x] P5-02 Build instruction/access update with step-up verification. *(Instruction editing + write-only encrypted access-secret replace with manager check; a customer-facing step-up *reveal* is deferred — access is intentionally write-only from the portal.)*
- [x] P5-03 Build history, exceptions, and signed-photo views. *(Service history with cycles, customer-visible exceptions + resolutions, and RLS-authorized short-lived signed proof photos; verified own=200 / foreign=404.)*
- [x] P5-04 Build pause/resume/cancel and Stripe portal. *(Pause/resume/cancel-at-renewal, audited; gates cycle generation — integration-tested; Stripe Customer Portal when configured, honest fallback otherwise.)*
- [x] P5-05 Build email/SMS outbox, retries, consent, and preferences. *(Sender worker with template rendering, Resend/dev provider, exponential backoff + claim; cron route guarded by CRON_SECRET; admin process-now; consent-append preferences. Twilio SMS delivery still off pending provider wiring.)*
- [x] P5-06 Build support tickets. *(Customer create/list via RLS; admin queue with audited status updates.)*

## Phase 6
- [x] P6-01 Build referral codes, attribution, credits, and fraud review. *(Qualifying event = first completed paid cycle -> pending Give $20/Get $20 credits (never auto-spendable); self-referral / shared-payment / shared-address / shared-email fraud flags; admin approve (pending->earned, cap-aware) or reject; customer referral page with share link + balances. Accrual/fraud/idempotency integration-tested. Credit amount lowered to Give $10/Get $10 2026-07-27 — see PP-02.)*
- [x] P6-02 Build One-Time Trash Day order flow with active-route/capacity validation. *(Checkout blocks one-time unless the address resolved to an active cell with capacity; verified 409 on a waitlist route.)*
- [x] P6-03 Build Bulk Pickup Coordination request, authorization, status, and provider-note flow. *(Authenticated customer request -> order; admin eligibility/status/provider-note flow. Public non-customers still routed via contact.)*
- [x] P6-04 Build separately quoted physical-placement review flow behind admin approval; keep Home Watch/Host Shield disabled. *(Placement is a distinct admin-quoted order_item, never implied/auto-charged; FEATURES flags keep Home Watch/Host Shield off.)*
- [x] P6-05 Build route/cell KPI dashboard. *(Reliability (proof rate, exceptions), route-economics (active properties, monthly-equivalent MRR by cell), exceptions-by-category — internal inputs, not public metrics.)*
- [x] P6-06 Build HOA/portfolio basics. *(Admin accounts view grouping HOA/portfolio vs individual with property counts, active subs, and completed-cycle totals.)*

## Phase 7
- [~] P7-01 Complete security/privacy review. *(Audit in docs/SECURITY_REVIEW.md: RLS/authz, service-role gating, webhook idempotency, access-secret handling, private-photo signed access, input validation, and PII logging all verified sound. Fixed 3 defense-in-depth gaps: security headers + CSP (next.config.ts), auth-session middleware, and a per-IP rate-limit baseline on public write endpoints. Distributed rate limiting, bot protection, nonce-based CSP, secret-rotation plan, and a third-party pen test remain owner/infra items.)*
- [~] P7-02 Complete accessibility/mobile/offline QA. *(Playwright suite (24 tests) covers address check, waitlist, buy-for-someone-else, role sign-ins + least-privilege, billing pause/resume, signed-photo authz, runner completion with proof, incident report, admin exception resolve + recheck, reports; axe WCAG 2.2 A/AA on 5 public pages; mobile-viewport runner check. Wired into CI with local Supabase. Offline/service-worker QA and manual screen-reader passes remain.)*
- [ ] P7-03 Complete backup/restore and incident drill. *(Draft runbooks ready: docs/operations/backup-and-restore-runbook.md + incident-response-plan.md; execution/drills + Supabase PITR config are owner tasks.)*
- [ ] P7-04 Replace all placeholders with verified production content. *(Checklist ready: docs/operations/production-content-readiness-checklist.md; owner supplies real content/imagery, prod infra, and live keys.)*
- [ ] P7-05 Verify legal/insurance/policy/SMS requirements. *(Full draft package for counsel: docs/legal/ (ToS, Privacy, SMS, ACH, referral, e-comms, accessibility) + docs/operations/insurance-and-legal-checklist.md; awaiting attorney/broker finalization.)*
- [ ] P7-06 Run shadow routes and staff training. *(Plan ready: docs/operations/shadow-route-and-staff-training-plan.md; execution is owner/staff.)*
- [ ] P7-07 Soft launch and monitor pilot metrics. *(Plan ready: docs/operations/soft-launch-and-pilot-metrics-plan.md; run after a route cell is activated.)*

Operational policy drafts also cover the remaining OPEN_DECISIONS items:
route-cell activation (#3), complexity/access adjustments (#4), bulk-pickup SOP
(#5), referral fraud/expiration (#6), data retention (#7), worker & field
standards (#8), customer-service SLA (#9), HOA pilot pricing/reporting (#11),
pause/cancel cutoff (#12), and the optional founder offer (#2). See
docs/operations/README.md and docs/legal/README.md.

## Post-launch changes

- [x] PP-01 Pricing pivot (2026-07-27). Repriced Home ($65/mo · $55/mo-quarterly) and Complete
  ($85/mo · $75/mo-quarterly); quarterly now shown as a discounted per-month rate via an accessible
  Monthly/Quarterly toggle on the pricing cards, payable by card or ACH (D-004/D-012/D-023 revised).
  Renamed "One-Time Trash Day" → "CurbSitter onDemand" ($39 → $25) and "Community & Portfolio" →
  "CurbSitter Enterprise" (display-only; internal ids unchanged). **Removed Bulk Pickup Coordination
  entirely** — routes, config, feature flags, nav, and admin tooling deleted (D-007 retired); this
  supersedes P6-03/P6-04. No cycle-engine or plan-id changes.
- [x] PP-02 Referral credits lowered to Give $10/Get $10 (2026-07-27, D-014 revised). Updated
  `REFERRALS` config, fixed two pre-existing hardcoded-`$20`/magic-number spots (public address-check
  copy, admin referrals page) to read from config instead, and updated tests/docs.
  **Reverted by PP-05 (2026-07-31)** — owner restored the original $20/$20 amount.
- [x] PP-03 Interactive map foundation slice (2026-07-27). Built the "Route-cell status map and
  legend" documented in `FRONTEND_GUIDELINES.md` but never implemented (public `/service-areas`,
  colored/labeled by state only, no counts), plus a customer-dashboard property-pin map on `/app`.
  New shared `MapBase`/`RouteCellMap`/`PropertyPinMap` components, a `route_cells` center-point
  migration + admin edit UI, and an RLS-scoped `createSupabaseAnonClient` for ISR-safe public reads.
  Admin multi-layer map, runner density map, and the waitlist-unlock gamification mechanic are
  explicitly deferred to separate future tickets.
- [x] PP-04 Admin multi-layer/search map (2026-07-27). Built the deferred admin ops map at
  `/admin/map`: route cells (colored by state) and every property across all accounts (colored by
  status) as independently toggleable layers on one `MapBase`, with a text search over cell
  name/slug, property address/city, or owning-account name (no dedicated HOA/subdivision tag column
  exists yet, so an HOA search works by account name), and click-to-popup for per-cell
  capacity/active-properties/MRR (reusing `getActiveMrrByCellId`, extracted from
  `getRouteCellReports` with no behavior change) and per-property status/account. Always-rendered
  accessible tables carry the same filtered data as the map. New `src/lib/admin-map.ts`,
  `src/components/map/admin-map-data.ts`/`admin-ops-map.tsx`/`admin-map-view.tsx`; `MapBase` gained
  optional `interactiveLayerIds`/`onClick` passthrough props (additive, non-breaking).
- [x] PP-05 Referral credits reverted to Give $20/Get $20 (2026-07-31, D-014 reverted). Owner
  decided the 2026-07-27 $10/$10 reduction had less pull than the original amount. Reverted
  `REFERRALS` config (`advocateCreditCents`/`referredCustomerCreditCents` back to 2000/2000),
  updated the unit test, code comments, and `PROJECT_TRUTH.md`/`DECISION_REGISTER.md`/
  `BUSINESS_CONFIG.md`. No hardcoded UI amounts existed to fix (PP-02 already routed the two
  spots that had them through config).

## Business-plan-review follow-ups (2026-07-31)

Tracked from the business-plan-research document review. See
`docs/adr/0002-business-plan-review-findings.md` for full rationale on each item and on what
was explicitly rejected (fuzzed/adaptive progress bars, bundled services, premature bundling
of adjacent services, ValetHero adoption) as conflicting with locked decisions.

Owner-supplied dashboard mockups (2026-07-31) are reviewed in
`docs/design/dashboard-mockup-review.md` — adoptable patterns, and the conflicts not to build
as drawn (mockup pricing is the research document's $40/mo-era numbers, not locked D-004
pricing; "Street captain · top 10%" ranking; inline gate codes on the runner route list).
Mobile is the priority viewport per the owner.

- [x] PP-06 Remove unused `h3-js` dependency. Confirmed zero references in `src/`; the locked
  architecture (D-011, named `route_cells` polygons, not a hex grid) never used it.
- [x] PP-07 Cluster admin map property pins instead of one DOM marker per property. Replaced
  per-property `<Marker>` rendering in `admin-ops-map.tsx` with a native Mapbox GL
  `cluster`/`cluster-count`/unclustered-point layer set on a GeoJSON `Source` — no new
  dependency, scales to thousands of points, avoids deck.gl's documented iOS-Safari
  float-texture heatmap caveat.
- [x] PP-08 Migrate address geocoding off the deprecated Mapbox Geocoding v5 endpoint
  (`src/lib/eligibility.ts`) to the current Search Box/Geocoding v6 API.
- [ ] PP-09 Hauler × collection-day matrix in eligibility. `route_cells.collection_days` exists
  but is read nowhere; `collection_schedules` is only consulted at cycle generation, after
  signup. Needs schema (haulers table or equivalent) — **schema migration, requires plan mode
  and owner review before implementation** per `.claude/rules/database.md` and `CLAUDE.md`.
- [ ] PP-10 Channel/campaign attribution column on `eligibility_checks`/`waitlist_leads` so
  door-hanger/QR/PPC ROI is measurable. **Schema migration — same plan-mode gate as PP-09.**
- [ ] PP-11 Ingest Yavapai County subdivision polygons (ArcGIS `Parcels` layer / Yavapai Open
  Data portal) into `route_cells.geometry` so maps render real boundaries instead of admin-set
  center points. Real business-critical geodata affecting live eligibility — **plan mode and
  owner review before ingesting/activating any boundary**, per `.claude/rules/database.md`
  ("never edit production manually through an agent") and the route-cell activation rule in
  `PROJECT_TRUTH.md`.
- [x] PP-16 Customer portal mobile bottom tab bar (2026-07-31). The portal nav was six text
  links in a horizontally-scrolling header row — sideways scrolling to reach later items and
  hit areas below the 44x44px rule the project already commits to. Added a mobile-only
  bottom tab bar (`src/components/site/portal-tab-bar.tsx`) with four permanent
  icon-plus-label targets at 56px, `aria-current` for the active tab, active state not
  carried by color alone, and safe-area inset padding. Header nav now `sm:`-and-up only;
  Notifications/Support stay visible as in-page links rather than hiding behind a "More"
  menu. New `tests/e2e/customer-portal.mobile.spec.ts` (4 tests) — **not executed locally,
  no Supabase stack in this environment; runs in CI.**
- [x] PP-12 Mobile map-first layout for `/admin/map` (2026-07-31). Below `sm` the map is the
  page (58svh) with a floating `Layers · N on` control (`map-layer-toggle.tsx`, built on
  native `<details>`) and a drag-up sheet (`admin-map-sheet.tsx`) holding search, real metric
  chips, legend, and card lists. From `sm` up the previous stacked layout is byte-for-byte
  unchanged. Sheet is toggled by a real button with `aria-expanded`, not a drag gesture —
  gesture-only is unusable by keyboard; collapsed content is `display:none` so it leaves both
  the tab order and the a11y tree. Chips show only computed values (MRR, cell count, property
  count); churn and LTV/CAC are deliberately absent until PP-10/PP-13 give them a real source.
  Layer toggles now also filter the sheet lists, matching desktop. Introduced a
  `data-testid` convention on the two layout wrappers (a11y-neutral) because both layouts
  carry the same data and unscoped accessible-name locators match twice; existing
  `admin-map.spec.ts` rescoped accordingly. New `tests/e2e/admin-map.mobile.spec.ts`
  (5 tests) — **not executed locally, no Supabase stack in this environment; runs in CI.**
  Known trade-off: both layouts are in the DOM, so list rows render twice. Fine at pilot
  scale; if `/admin/map` ever loads thousands of properties, condense or virtualize the
  mobile list rather than duplicating it.
  Also fixed `playwright.config.ts`: the `chromium` project had no `testIgnore`, so it ran
  every `*.mobile.spec.ts` at desktop width in addition to the `mobile` project. Harmless for
  the pre-existing `runner.mobile.spec.ts` (that view renders the same at both widths), but
  the new mobile specs assert `sm:hidden` UI and would have failed under `chromium` for the
  wrong reason. The `.mobile.spec.ts` suffix now actually selects a viewport.
- [x] PP-17 Runner offline proof-photo queue and sync state (2026-07-31). **The ticket's
  premise was wrong and the scope changed:** there was no offline queue to surface. No service
  worker, no IndexedDB, no `navigator.onLine` anywhere — P4-04 had listed the retry queue as
  *remaining* work and I misread it as done. Worse, three places already told runners their
  work was saved when it was not: the transition failure ("Your work is safe"), the photo
  failure ("The photo stays on your device"), and the server's 503 ("It's saved on your
  device"). The captured `File` was dropped outright, so a runner in a dead zone believed
  their proof was queued and would have to re-shoot it.
  Built the queue those messages already promised: `src/lib/photo-queue.ts` (IndexedDB store,
  browser-only, plus pure retry-scheduling helpers) and
  `src/components/runner/use-photo-queue.ts` (a module-level external store read through
  `useSyncExternalStore`, so the task screen and route list share one snapshot with no custom
  events). Captures are written to IndexedDB *before* upload is attempted, so an interrupted
  request still leaves the photo recoverable. Auto-drains on reconnect with capped backoff;
  manual "Retry now"; queued photos never satisfy the completion gate (the server enforces
  that independently). New `RouteSyncStatus`/`StopSyncBadge` render only when there is
  something to report — a permanent "all synced" badge trains runners to ignore the row.
  Stores only blob + task id + photo type + retry bookkeeping: no addresses, access codes, or
  signed URLs, per the `TECH_STACK.md` prohibition on persisting those in browser storage.
  Entries leave only on successful upload or explicit discard — never a silent timer, since
  auto-evicting a proof photo would reintroduce the same lie quietly.
  Tests: 5 unit tests for retry scheduling; `tests/e2e/runner-offline.mobile.spec.ts` (4
  tests) drives the real offline path via Playwright `setOffline`. **e2e not executed locally
  — no Supabase stack in this environment.**
- [ ] PP-18 Queue runner *task transitions* offline, not just photos. Completion already has
  server-side replay protection (`idempotencyKey` + the unique
  `service_tasks.completion_idempotency_key`), so this is safe in principle — but it means
  replaying state-machine writes from a device, which `CLAUDE.md` gates behind plan mode.
  Deliberately excluded from PP-17; the transition error copy now says only that the step
  wasn't recorded.
- [ ] PP-19 Photo-upload idempotency. A retry after an ambiguous failure (server committed,
  response lost) can create a duplicate `service_photos` row, which is customer-visible in
  service history. Needs an additive migration adding a unique client-supplied upload id —
  **schema change, plan-mode gated.** Narrow window and low harm, hence not blocking PP-17.
- [ ] PP-20 Service worker for route/task shell caching, so the runner UI itself loads with no
  signal. PP-17 makes captured work survive; it does not make the app reachable offline.
  `TECH_STACK.md` scopes this to "route/task shell, draft task actions, and photo upload
  retry" and bars caching access codes, billing data, or signed photo URLs.
- [ ] PP-13 Churn / LTV-CAC KPIs on `/admin/reports` with a chart library (Recharts). Depends
  on PP-10 existing first — the channel-ROI panel in the owner's admin mockup has nothing to
  group by until the attribution column exists. Also includes the mockup's density-by-route
  chart with a dashed breakeven line (renders the `PROJECT_TRUTH.md` route-density rule as a
  glanceable pass/fail).
- [x] PP-14 Self-serve reschedule for CurbSitter onDemand orders (2026-08-02). **Scope changed
  on owner clarification:** subscriptions run on one fixed weekday per route cell
  (`PROJECT_TRUTH.md`), so a generic "move my visit" control isn't physically meaningful there
  — pause/resume (P5-04) already covers "skip an upcoming visit" for subscriptions. Owner
  confirmed reschedule applies only to the one-time onDemand order, with auto-approval gated on
  whether that order's route has been built yet (technical equivalent of "24+ hours notice,
  unless tomorrow's route isn't set").
  Investigating turned up P6-02 was never finished past the checkout capacity gate: no date was
  ever collected or stored, no admin review path existed for `orders` (`/admin/reviews` only
  queried `subscriptions`), nothing generated `service_tasks` for an order, and customers had no
  way to see a one-time order anywhere in the portal. Fixed all of it under this ticket (owner
  chose not to split it out) — no schema migration needed, `orders.requested_date` already
  existed as an unused column.
  New: `src/lib/orders.ts` (`generateTasksForOrder`, `rescheduleOrder`), `src/lib/phoenix-date.ts`
  (pure date helpers extracted from `cycles.ts` so `onboarding-schemas.ts` can use them without
  pulling `server-only` into the client bundle), an orders review queue on `/admin/reviews`, a
  "Your one-time service" section + reschedule form on `/app`, and an orders section on
  `/app/history`. Onboarding stage 3 collects a requested date for onDemand, validated against
  the property's verified collection weekday both client- and server-side. The requested date
  is always the pickup/collection date (matching `collection_schedules.weekday`, the same
  anchor `generateCyclesForDate` already uses) — rollout is *always* computed as the evening
  before, never asked for directly. The first copy draft ("What date do you need this
  service?") didn't make that distinction explicit and a manual walkthrough during review hit
  the resulting confusion firsthand; both the onboarding field and the portal reschedule field
  now say "pickup date" and show a live confirmation of which evening bins go out.
  Tests: 6 new integration tests (`tests/integration/order-generation.test.ts`) covering
  weekday-mismatch rejection, idempotent generation, and the reschedule auto-approve/blocked
  gate; 3 new Playwright specs (order review approve, reschedule allowed, reschedule blocked) —
  all run against a real local Supabase stack and pass, along with the full existing desktop e2e
  suite (33/33) and the manual onboarding-form walkthrough. Order lifecycle intentionally stops
  at `scheduled` — auto-flipping to `completed` when its tasks finish would touch the shared
  runner-completion path (`src/lib/tasks.ts`) and is a natural follow-up, not built here.
  Found and flagged (not fixed, out of scope) a pre-existing stale assertion in
  `tests/integration/referrals.test.ts` still expecting the $10 credit amount PP-05 reverted to
  $20 on 2026-07-31.
- [ ] PP-15 Ongoing: before/after each work session, check for and stop any background
  processes (dev servers, watch tasks, agents) not currently needed, to conserve resources.
  Standing practice per owner request 2026-07-31, not a one-time item.

## Current ticket

Set exactly one current ticket here before an agent begins:

`CURRENT: PP-14`
