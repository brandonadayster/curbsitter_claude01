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
- [ ] P1-04 Create private storage and signed URL service. *(Private buckets exist with zero client policies; signed-URL mint endpoint lands with runner photo flow in Phase 4.)*
- [ ] P1-05 Isolate/encrypt access data and audit privileged actions. *(Isolation + AES-256-GCM encryption done; step-up reveal + audit_log wiring remain.)*

## Phase 2
- [x] P2-01 Build design tokens/public shell. *(FRONTEND_GUIDELINES tokens in globals.css, header/footer, reduced-motion, focus states.)*
- [x] P2-02 Build core marketing pages and content. *(All APP_FLOW public routes with truthful copy; legal pages are marked drafts pending counsel.)*
- [x] P2-03 Build address normalization and route-cell engine. *(Geocode + point-in-cell for active results; zip buckets only for non-active outcomes; every check recorded.)*
- [x] P2-04 Build waitlist and consent flow. *(Versioned consent rows, share codes, referral attribution, outbox-queued confirmation.)*
- [ ] P2-05 Build route-cell admin. *(Route cells seeded and queryable; admin UI not built.)*
- [ ] P2-06 Add SEO, structured data, analytics events, and accessibility checks. *(Metadata/sitemap/robots done; structured data, analytics events, and automated axe checks remain.)*

## Phase 3
- [x] P3-01 Build four-stage onboarding. *(Draft persistence with capability token, resume, progress UI.)*
- [x] P3-02 Build contacts/payer/recipient/property/bin/schedule intake. *(Buy-for-someone-else supported; extra notification recipients UI minimal.)*
- [x] P3-03 Build secure access/hazard intake. *(Secrets split from stage data at the boundary, encrypted at rest, never echoed to the client.)*
- [x] P3-04 Build server-side pricing/config. *(`buildQuote` from typed config; complexity flags review, never a surcharge; unit-tested.)*
- [x] P3-05 Integrate Stripe and idempotent webhooks. *(Checkout for monthly card / quarterly prepaid ACH / one-time; webhook_events ledger; needs test keys in .env.local to exercise end-to-end.)*
- [ ] P3-06 Create serviceability review state and communications. *(pending_serviceability_review state + welcome email queued; admin review queue and outbox sender worker remain.)*

## Phase 4
- [ ] P4-01 Build cycle/task generation.
- [ ] P4-02 Build admin review and route builder.
- [ ] P4-03 Build runner route/task UI.
- [ ] P4-04 Build photo capture/compression/private upload/retry.
- [ ] P4-05 Build explicit state machine and event log. *(Schema for cycles/tasks/task_events/exceptions exists with RLS; application logic remains.)*
- [ ] P4-06 Build exception, recheck, and safety incident workflows.

## Phase 5
- [ ] P5-01 Build customer overview and multi-property views. *(Minimal authenticated /app status page exists.)*
- [ ] P5-02 Build instruction/access update with step-up verification.
- [ ] P5-03 Build history, exceptions, and signed-photo views.
- [ ] P5-04 Build pause/resume/cancel and Stripe portal.
- [ ] P5-05 Build email/SMS outbox, retries, consent, and preferences. *(Outbox table + consent records exist; sender worker and preferences UI remain.)*
- [ ] P5-06 Build support tickets. *(Table + contact-form intake exist; customer/admin ticket UI remains.)*

## Phase 6
- [ ] P6-01 Build referral codes, attribution, credits, and fraud review. *(Codes + attribution live in waitlist/onboarding; credit accrual on qualifying cycle, caps, and fraud review remain.)*
- [ ] P6-02 Build One-Time Trash Day order flow with active-route/capacity validation. *(Selectable in onboarding; capacity validation remains.)*
- [ ] P6-03 Build Bulk Pickup Coordination request, authorization, status, and provider-note flow.
- [ ] P6-04 Build separately quoted physical-placement review flow behind admin approval; keep Home Watch/Host Shield disabled.
- [ ] P6-05 Build route/cell KPI dashboard.
- [ ] P6-06 Build HOA/portfolio basics.

## Phase 7
- [ ] P7-01 Complete security/privacy review.
- [ ] P7-02 Complete accessibility/mobile/offline QA.
- [ ] P7-03 Complete backup/restore and incident drill.
- [ ] P7-04 Replace all placeholders with verified production content.
- [ ] P7-05 Verify legal/insurance/policy/SMS requirements.
- [ ] P7-06 Run shadow routes and staff training.
- [ ] P7-07 Soft launch and monitor pilot metrics.

## Current ticket

Set exactly one current ticket here before an agent begins:

`CURRENT: P2-05`
