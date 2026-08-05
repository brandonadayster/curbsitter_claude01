# Session handoff — onboarding redesign (in progress)

**Date:** 2026-08-03
**Branch:** `claude/next-agenda-item-3accc3` (worktree `next-agenda-item-3accc3`)
**State:** lint ✅ · typecheck ✅ · unit/integration tests not yet re-run after latest edits · e2e not re-run · nothing committed

---

## 1. What shipped earlier this session (DONE, verified)

### PP-14 — Self-serve reschedule for CurbSitter onDemand orders
Checked off in `TODO.md` with a full note. Verified green: lint, typecheck, 6 new integration
tests, 3 new Playwright specs, and the full 33-test desktop e2e suite all passed against a live
local Supabase stack. Also manually walked in the browser.

**Scope note:** the ticket said "reschedule *and per-visit skip*". Owner clarified reschedule
applies **only to one-time onDemand orders** — subscriptions run one fixed weekday per route cell,
and pause/resume (P5-04) already covers "skip a visit" there. No skip control was built.

Investigating turned up that **P6-02 was never finished** past the checkout capacity gate — no date
was collected, no admin review path existed for `orders`, nothing generated `service_tasks` for an
order, and customers couldn't see orders at all. All of that was fixed under PP-14 (owner chose not
to split it out).

---

## 2. What is IN PROGRESS (the onboarding redesign)

Approved plan lives at `/home/brandon/.claude/plans/hashed-booping-abelson.md` — **read this first.**

### Owner decisions already taken (do not re-litigate)
- **No fabricated reviews.** Owner asked for persona-specific customer reviews; CurbSitter is
  pre-launch and `AGENTS.md` hard-bans fake testimonials (D-015). Owner chose **benefits + FAQs
  only**, no review slot at all until real reviews exist.
- **`properties.property_type` gets its own column** — owner approved the migration in planning,
  satisfying the `.claude/rules/database.md` sign-off requirement.
- **Drop organics/other bin types.** Web-checked City of Prescott: trash + recycling only curbside,
  no organics/greenwaste stream, and the two are collected same day (different trucks).
- **No service date at signup.** Onboarding asks only the collection *day of week*; the actual date
  is derived at approval ("that's for us to know" — rollout is always the evening before).

### Code written so far (all lint+typecheck clean)
| File | Status |
| --- | --- |
| `supabase/migrations/20260803120000_property_type.sql` | NEW — additive, applied via `db reset`, verified |
| `src/lib/personas.ts` | NEW — `resolvePersona()` + per-persona headline/benefits/FAQs, all lifted from approved marketing copy |
| `src/components/onboarding/persona-panel.tsx` | NEW — presentational panel |
| `src/lib/onboarding-schemas.ts` | stage1 gained `servingWho` + `propertyType` (replacing `forSomeoneElse`); stage3 replaced `binCount`/`binTypes` with `hasBothBinTypes`/`trashBinCount`/`recyclingBinCount`, added `sameDayCollection`/`recyclingCollectionDay`/`recyclingCollectionDayUnsure`, dropped `requestedDate` |
| `src/components/onboarding/onboarding-flow.tsx` | REWRITTEN — stage-1 persona/property questions, stage-3 click-to-answer sub-wizard, persona panel wired |
| `src/lib/onboarding.ts` | per-type bin inserts (fixes a real alternation bug), 1-or-2 schedule rows per the Home/Complete coverage rule, writes `property_type`, derives `account_type` from persona, drops `requested_date` write |
| `src/lib/pricing.ts` | `binLimitOk` now sums trash + recycling |
| `src/lib/phoenix-date.ts` | added `nextOccurrenceOfWeekday` |
| `src/lib/orders.ts` | `generateTasksForOrder` computes the date from the trash weekday instead of validating a supplied one; `trashWeekdayForProperty` scoped to `waste_stream='trash'` (important — a Complete property can now have 2 schedule rows and `.maybeSingle()` would have errored) |
| `src/app/(admin)/admin/reviews/page.tsx` | dropped the pending "requested for &lt;date&gt;" line; added a "no verified collection day" danger note |
| `tests/unit/pricing.test.ts` | fixture updated + new trash/recycling sum test |
| `tests/integration/onboarding-finalize.test.ts` | fixture updated to the new stage1/stage3 shape |

### The schedule-row rule (most important logic — don't break it)
`generateCyclesForDate` creates one cycle **per matching `collection_schedules` row**, so writing a
second row when trash and recycling share a day would **double-book one real visit**.
- Same day → exactly **one** row (`waste_stream='trash'`), every plan. Unchanged from before.
- Different days + **Complete** (`collectionCoverage: 'all_regular_collection_days'`) → **two** rows.
- Different days + **Home** (`one_regular_day_per_week`) → **trash row only**, plus an inline
  factual note in the UI. No silent upgrade, no price change.
- onDemand → always trash only.

`collectionCoverage` already existed in `src/config/business.ts` but was **read nowhere** — this is
the first thing that consumes it.

---

## 3. WHAT'S LEFT (pick up here)

1. **Browser walkthrough of the new stage-3 sub-wizard** — never done. Four branches to check:
   trash-only, same-day trash+recycling, different-day on Home (should show the coverage note),
   different-day on Complete. Desktop *and* mobile (mobile is the owner's priority viewport).
2. **Unit tests for `resolvePersona()`** — not written yet. Cover each servingWho/propertyType
   pairing and the null/default case.
3. **Integration coverage** for the schedule-row rule (Home vs Complete × same vs different day),
   per-type bin counts, `property_type` persistence, and the computed onDemand date.
4. **`tests/e2e/public-acquisition.spec.ts`** asserts on the old `forSomeoneElse` checkbox —
   **will fail** until updated for the new persona question. Expected, not a regression.
5. **Re-run** `npm test` + full Playwright suite.
6. **Accessibility pass** on the rebuilt stage 3 — buttons are real `<button>`s with `aria-pressed`
   and `min-h-[44px]`, but the axe pass over `/onboarding` hasn't been re-run.
7. **`TODO.md`** — add a new ticket entry for this redesign (it's materially separate from PP-14,
   which is already checked off).

### Known open risk (documented in the plan, worth watching)
Stage 3 went from one scrolling form to ~13 one-question screens. More clicks, each easier. Draft
resume persists `current_stage`, not sub-step, so an abandoned signup resumes at the *top* of stage 3.
Persisting sub-step would change the draft API contract — deliberately out of scope.

---

## 4. Environment notes

- `.env.local` exists (gitignored) with local Supabase demo keys + a dev-only `ACCESS_SECRETS_KEY`.
- Local Supabase was **stopped** at end of session. Restart: `npx supabase start`.
- The migration is already applied to the local DB (via `npx supabase db reset`, which also reseeds).
- For realistic dashboard data, run the e2e fixture provisioner — see the tsx one-liner pattern used
  this session, or just run `npx playwright test` which provisions in `global-setup`.
- Dev users, all password `devpassword123`: `admin@` / `runner@` / `customer@curbsitter.test`.
- `node_modules` in this worktree was empty at session start — `npm install` was run. Turbopack
  needs it locally; other tools were silently resolving from the parent checkout.

## 5. Unrelated pre-existing bug (flagged, NOT fixed — out of scope)

`tests/integration/referrals.test.ts:84` asserts `amount_cents === 1000` ($10), but
`src/config/business.ts:95-96` is `2000` ($20) — PP-05 reverted the credit amount on 2026-07-31 and
this test was never updated. It fails on every `npm test` run. A background task chip was spawned
for it (`task_5db3b98d`).
