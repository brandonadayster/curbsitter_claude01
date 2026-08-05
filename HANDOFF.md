# Session handoff — D-027 landed

**Date:** 2026-08-05
**Branch:** `claude/d-027-continuation-67fcdc` (worktree `d-027-continuation-67fcdc`)
**Last commit:** `8bc5629` — "D-027: auto-approve clean signups; D-025 lookup moves to stage 1"
**State:** lint ✅ · typecheck ✅ · 107/108 unit+integration ✅ · 50/50 e2e ✅ · working tree clean

Plan: `/home/brandon/.claude/plans/clever-humming-diffie.md`. Prior plan (D-024/025/026 context): `/home/brandon/.claude/plans/synthetic-mixing-bear.md`.

---

## 1. Branch note (read first)

This branch was created from `main`, not from the D-025/D-026 work, so it originally lacked every prerequisite. It was **rebased onto `claude/next-agenda-item-3accc3`** (tip `715ac82`) at the start of this session. Both branches now share history up to `715ac82`; this branch adds `8bc5629` on top. `claude/next-agenda-item-3accc3` has *not* been updated — don't work in both.

`npm ci` was run here (the worktree had no `next` installed), and `.env.local` was copied from the other worktree.

---

## 2. What shipped

**D-027 auto-approval.** `finalizeOnboardingDraft` (`src/lib/onboarding.ts`) gained:
```ts
autoApprove = trashReviewReason === null && draft.commercial_check?.status === "residential"
```
True → `properties.status='active'`, `subscriptions.status='active'` or `orders.status='approved'` **plus `generateTasksForOrder()`** (parity with `decideOrderReview`), `service_confirmed` notification, and an `auditLog` entry with `actorId: null`. False → completely unchanged from before. Fails safe on any missing/failed/unrecognized state. Hazards never participate.

**D-025a — City lookup moved to stage 1.** New `onboarding_drafts.city_lookup` column (migration `20260805120000`). `verifyCollectionDay` was replaced by `lookupCityWeekday()` (raw I/O) + `combineDayCheck()` (pure classification), so the stage-3 route is now a read-combine-write with no live zone query. Two new `collection_day_check` statuses: `city_resolved` (unsure customer, City supplied the day — treated as verified) and `unsure_no_data` (nobody knows the day — proceeds, admin resolves).

**Admin day resolution.** New `setCollectionDay` server action + inline weekday picker on any queue item missing a day. **Nothing in the app could set a collection day before this** — the "No verified collection day, approving will fail" warning was previously a dead end. Also: review-reason banners (city mismatch / manual-lookup-needed / non-residential) and a `commercial_check` join by account.

**WM rejected.** Investigated live. `rest-api.wm.com/account/search` → `/services` → `/pickupinfo`, requires a Google Place ID (we use Mapbox), returns `401 UnauthorizedException` without an Okta token. It's an access-controlled private API returning third-party *customer account* records — categorically different from the City's open zone polygons. Owner chose manual admin lookup instead. Recorded as D-025a; **do not revisit without documented granted access from the hauler.**

---

## 3. Bug fixed in passing (important)

`draftView` (`src/lib/onboarding.ts`) re-parsed `stage3` with `stage3Schema` *after* the PATCH route had split `accessSecretNotes` into the `access_secrets` column — so D-026's gate/garage minimum-length rule failed for **every gated property, at stage 3, before payment.** Signup was impossible for anyone with a gate or garage.

This is the same trap the last handoff flagged and fixed in `finalizeOnboardingDraft` — `draftView` was missed. **Any future stage3 validation touching `accessSecretNotes` must re-check both call sites.**

---

## 4. Public claims corrected

Four places asserted every account is reviewed before first service, which D-027 makes false: `/terms` ("Serviceability review"), `src/app/(marketing)/faq/page.tsx`, `src/lib/personas.ts`, and the stage-4 onboarding review card. `/terms` also gained a **"Collection schedule accuracy"** section disclaiming liability for missed collection caused by inaccurate customer-supplied hauler/day info — no public source covers every address in Prescott or Yavapai County. An inline version of that disclaimer sits on the trash-day question.

---

## 5. Verified against live data

Using the seeded eligibility check (133 S Cortez St):
- Stage 1 wrote `city_lookup = {status:'found', cityWeekday:4}` (Thursday — matches the City).
- The parcel check returned `{status:'flagged', usageType:'Qualified Exmpt', usageDesc:'9270-CHURCH, RELIG USE'}` — that address is a church, correctly **not** auto-approve-eligible.
- API: unsure → `city_resolved`/4; day 4 → `match`; day 1 → `mismatch`.
- Browser: "I'm not sure" advanced silently with the day filled in from City data; disclaimer renders; no console errors.

---

## 6. Known / not done

- **PP-05 referral drift** — `tests/integration/referrals.test.ts:84` expects `1000`, `business.ts` says `2000`. Pre-existing, fails every run, tracked as `task_5db3b98d`. Don't chase.
- **D-026 cleanup — done** (commit after `8bc5629`): hazards block + `property_hazards` join removed from the admin review page, `requiresAccessReview` retired end to end.
- **D-024 (pickup date display + lead-time floor)** — still not built. Next up. `nextOccurrenceOfWeekday` is already pure/client-safe; the proposed 2-day floor was never confirmed.
- **`ACCESS_SECRET_MIN_LENGTH = 10`** — still an arbitrary placeholder.
- **A fail-open worth knowing:** a draft with no `collection_day_check` at all (private-hauler skip, or a failed check the client swallowed) plus a residential parcel **will auto-approve** on the customer's self-reported day. This is the approved design for private haulers, but a transient check failure lands in the same bucket. If that becomes a concern, the fix is a distinct `check_failed` status on `CityLookup`.
- **Stage-1 latency** — draft creation now waits on a live ArcGIS parcel query (8s timeout, parallel with the zone lookup). Fast in practice; worst case adds real delay to the signup path.
- The City ArcGIS reuse terms are still unconfirmed with City of Prescott Solid Waste.
- Holiday collection shifts still unmodeled.

---

## 7. Environment

- Local Supabase running; all migrations applied; 16 City zones cached.
- **`service_confirmed` was inserted into `notification_templates` by hand** on this local DB, because the migration had already run before that insert was added to it. A fresh `supabase db reset` applies it properly. `notification_outbox.template_id` is a FK, so a missing template row silently drops the notification.
- No Mapbox token, so a fresh address geocodes to null → `geocode_failed`. Use the seeded `eligibility_checks` row `11ef9ae2-edad-4898-bd68-c71002475809` (133 S Cortez St, City day = Thursday) to exercise real paths.
- Dev users, password `devpassword123`: `admin@` / `runner@` / `customer@curbsitter.test`.
- Dev server was stopped at end of session (PP-15).
