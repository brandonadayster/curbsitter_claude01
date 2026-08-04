# Session handoff — D-024 / D-025 / D-026 / D-027 (continued)

**Date:** 2026-08-04
**Branch:** `claude/next-agenda-item-3accc3` (worktree `next-agenda-item-3accc3`)
**Last commit:** `e4fb70f` — "PP-21 follow-ons: pickup-date groundwork, City day verification, hazard-review removal"
**State:** lint ✅ · typecheck ✅ · 89/90 tests ✅ (one known pre-existing failure, see §6) · working tree clean · **everything below is committed**

**Approved plan lives at `/home/brandon/.claude/plans/synthetic-mixing-bear.md` — read it first.** This doc records what actually landed, what changed vs. that plan, and what's left.

---

## 1. The four decisions (all in `DECISION_REGISTER.md` except D-027)

- **D-024** — show customers a confirmed *pickup date*, not just a weekday, for subscriptions and onDemand. Reuses PP-14's "pickup date" + rollout-evening-confirmation copy pattern. **Not yet built.**
- **D-025** — auto-verify collection day against the City of Prescott's public ArcGIS layer. **Built and verified.**
- **D-026** — admin stops reviewing hazard/access flags; schema validation replaces it. **Mostly built** (schema + onboarding UI done; admin UI removal and `requiresAccessReview` retirement still pending).
- **D-027** — **narrows D-018.** Clean signups (collection day not a disputed conflict + property confirmed residential) activate immediately with no admin click. Anything else still queues for review. Hazards do *not* gate this. **Not yet built, and its register entry is NOT yet written.**

D-027 is the one that delivers the actual customer-facing payoff (paid → confirmed, instead of paid → silence), which is why it's next up rather than D-024.

---

## 2. What's built and verified

### D-025 — collection-day verification (complete)
| File | What it is |
| --- | --- |
| `supabase/migrations/20260804120000_city_route_day_zones.sql` | Cache table for the City's 16 route-day polygons. Service-role only, no RLS policies (same posture as `property_access_secrets`). |
| `supabase/migrations/20260804120100_collection_day_verification.sql` | Adds `needs_review_reason` + `city_weekday` to `collection_schedules`; `collection_day_check` + `commercial_check` jsonb to `onboarding_drafts`. |
| `scripts/sync-city-route-days.mjs` | Fetches the ArcGIS layer with `outSR=4326&f=geojson` (server-side reprojection — no coordinate-transform code needed). Upserts, *then* deletes stale rows. Writes nothing on a failed/malformed fetch. |
| `.github/workflows/sync-city-route-days.yml` | Monthly cron + `workflow_dispatch`. **Needs real prod `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` secrets before it can run.** |
| `src/lib/geocode.ts` | `geocode()` extracted out of `eligibility.ts` (pure refactor, no behavior change). |
| `src/lib/collection-day-verification.ts` | `verifyCollectionDay()` — reads *our cache*, never the live endpoint at signup. Returns match / mismatch / no_zone_data. Also exports the `CollectionDayCheck` type. |
| `src/app/api/onboarding/draft/[token]/collection-day-check/route.ts` | POST runs the check; PATCH records a customer keeping their own answer. |

**Verified end-to-end against live City data** (browser + direct API): match auto-advances, mismatch shows the conflict card with both resolutions working, private hauler skips entirely, geocode failure blocks.

### Provider question reordered (NEW — not in the original plan)
Owner asked mid-session to swap questions 5 and 6. Provider now comes **before** the day question and is **click-to-answer** (`City of Prescott` / `A private hauler` / `I'm not sure`), with an optional free-text hauler name shown only for "private."

Why it matters: a private-hauler property now **skips the City check entirely** rather than being shown a conflict about a hauler that isn't theirs. Verified: private hauler + Monday (City says Thursday) → advances clean, no card, no check recorded.

Added `collectionProviderKind` to `stage3Schema`. Dropped the stale "Patriot Disposal" placeholder — that company was acquired by WM.

### D-026 — partially built
- `stage3Schema.superRefine` now requires access notes ≥ `ACCESS_SECRET_MIN_LENGTH` when `gate`/`garage` is flagged (client + server, same schema).
- Access step label no longer says "Optional"; finally renders its `<Err>`.

### PP-21 leftovers (all done)
`tests/unit/personas.test.ts` (10), `tests/integration/onboarding-schedule-rows.test.ts` (15), `tests/e2e/onboarding-a11y.spec.ts` + `.mobile.spec.ts` — full onboarding flow scans clean at WCAG 2.2 AA on both viewports.

---

## 3. Bug found and fixed (worth knowing — the pattern will recur)

D-026's new validation broke `finalizeOnboardingDraft`: it re-parses `draft.stage3` with `stage3Schema`, but the PATCH route **deliberately strips `accessSecretNotes` into the separate `access_secrets` column** (the security rule working as designed). So the new gate/garage requirement saw an empty value and threw — meaning **every gated property would fail to finalize *after paying*.**

Fixed by reassembling the logical stage3 before parsing (`src/lib/onboarding.ts` ~line 99). The existing integration test caught this. **If you add any further stage3 validation touching `accessSecretNotes`, re-check this path.**

---

## 4. WHAT'S LEFT (recommended order)

1. **D-027 auto-approve branch** in `finalizeOnboardingDraft` — the payoff piece.
   - `autoApprove = collection_day_check.status !== 'mismatch'/'mismatch_confirmed' && commercial_check.status === 'residential'`. Everything defaults to *needs review* on any missing/failed/unrecognized state. Hazards are **not** part of this condition.
   - True → `properties.status='active'`, `subscriptions.status='active'` or `orders.status='approved'` (order *scheduling* still happens later via the unchanged `generateTasksForOrder` — this only skips the manual approval).
   - False → unchanged from today.
2. **Wire the commercial check into stage-1 draft creation** (`src/app/api/onboarding/draft/route.ts`) — `checkPropertyUsage()` already exists and is verified working; it just isn't called anywhere yet. Store into `onboarding_drafts.commercial_check`.
3. **`notifications.ts` → new `service_confirmed` case.** Do *not* reuse `review_approved` — its copy says "your property passed review," which implies a human acted. New copy: service is active, next trash day visible in the dashboard.
4. **D-024 pickup-date display + lead-time floor** — `nextOccurrenceOfWeekday` (already pure/client-safe) computed at display time, deliberately *not* a new stored field. Floor bumps the shown date if the next occurrence is too soon for a never-visited property.
5. **Admin review UI** (`src/app/(admin)/admin/reviews/page.tsx`) — remove the "Flags:" hazards block (both copies) and drop `property_hazards` from both `select()`s; add the mismatch banner (`needs_review_reason` = `city_mismatch` vs `customer_unsure`) and a commercial-flag banner.
6. **Retire `requiresAccessReview`** across `pricing.ts`, `onboarding-flow.tsx`, `onboarding.ts`, `tests/unit/pricing.test.ts`. Confirmed safe: the `welcome_pending_review` email template (`notifications.ts:38`) just drops a conditional sentence — no template rewrite needed.
7. **Write the D-027 register entry** + annotate D-018 as "(narrowed 2026-08-04, see D-027)" + add the retired-decisions line. Draft copy is in the plan file.
8. **Remaining tests** — unit (`onboarding-schemas`, `collection-day-verification`, `property-usage-check`), integration (all `collection_day_check` × `commercial_check` combinations, sync upsert/delete semantics with mocked fetch), e2e (conflict states, admin queue, service-confirmed flow).
9. **`TODO.md`** — add a ticket entry for this whole body of work.

---

## 5. Decisions made mid-session (beyond the plan file)

- **Recycling day is explicitly out of scope** for verification — the City's data models one day per zone, and legitimate exceptions exist. Recycling stays pure self-report.
- **Admin approval stays one-click on a mismatch** — banner for visibility, no blocking checkbox.
- **`requiresAccessReview` gets retired entirely** (not kept as informational copy).
- **`USAGE_TYPE` classification** (from the 24 real values in county data): residential = `Residential`, `Duplex`, `Triplex`, `Mobile Home`, `MH Affixed`. Everything else — including `Multi-Res` and `MH/RV Park` (usually managed multi-unit with centralized service) and anything unrecognized — flags for review.
- **`mismatch` vs `mismatch_confirmed`** are distinct statuses. Only `match` and `no_zone_data` are auto-approve-eligible.

### Still unconfirmed (placeholders in code)
- `ACCESS_SECRET_MIN_LENGTH = 10` — arbitrary, needs a real number + matching error copy.
- **Lead-time floor** for D-024 — proposed 2 days, never confirmed.

---

## 6. Environment notes

- Local Supabase **is running**; both new migrations applied; 16 City zones synced (`npm run sync:city-route-days`, idempotent, safe to re-run).
- **No Mapbox token in `.env.local`** — so `geocode()` returns null and a fresh address hits `geocode_failed`. To test the real paths, seed coordinates:
  - Already seeded: `eligibility_checks` id `11ef9ae2-edad-4898-bd68-c71002475809` = 133 S Cortez St, lat `34.5406286821427`, lon `-112.468507978073`. **The City says Thursday (weekday 4) for this address** — pick anything else to trigger a mismatch.
  - Test draft token: `718a7d2a8cbe303567b245f04ffa1733b9f608b72f5a4266` (currently mid-stage-3; reset its `collection_day_check`/`stage3` to replay).
- Dev users, password `devpassword123`: `admin@` / `runner@` / `customer@curbsitter.test`.
- Dev server was left running on :3000 — **stop it if not needed** (PP-15 standing practice).

## 7. Known pre-existing failure (not ours, don't chase it)

`tests/integration/referrals.test.ts:84` expects `amount_cents === 1000` but `business.ts` says `2000` — PP-05 reverted the credit to $20 on 2026-07-31 and the test was never updated. Fails on every run. Background task `task_5db3b98d` already tracks it.

## 8. Open items deferred to their own future work

- **Multi-property signup** ("Add another property" pre-payment, multi-property rate). Owner likes the idea; needs its own plan + a pricing decision entry. Note: persona copy *already claims* "one account can manage multiple properties," so this closes a real promise gap.
- **HOA/Enterprise property-count threshold** — the "5 or 10 properties" cutoff is **not coded anywhere**; `COMMUNITY_PORTFOLIO` in `business.ts` only has `pricing: custom_quote`.
- **Holiday collection shifts** — the City shifts days for holidays via per-holiday toggles on their residential-collection page, which the ArcGIS layer does *not* model. Our synced day will be wrong those weeks. Not handled; needs its own approach.
- **Maps** (subdivision/HOA boundaries, City day layer, heatmap) — deferred conversation. Key facts: no Mapbox token configured; PP-11 (Yavapai County parcel ingestion into `route_cells.geometry`) is the real prerequisite and is plan-mode gated; a heatmap was already explicitly rejected in `docs/adr/0002` in favor of native Mapbox GL clustering (PP-07).
- **City ArcGIS reuse terms** — the City publishes no explicit license. Confirm with City of Prescott Solid Waste before relying on the sync in production.
