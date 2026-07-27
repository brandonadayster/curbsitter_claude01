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
- [x] P6-01 Build referral codes, attribution, credits, and fraud review. *(Qualifying event = first completed paid cycle -> pending Give $20/Get $20 credits (never auto-spendable); self-referral / shared-payment / shared-address / shared-email fraud flags; admin approve (pending->earned, cap-aware) or reject; customer referral page with share link + balances. Accrual/fraud/idempotency integration-tested.)*
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

## Current ticket

Set exactly one current ticket here before an agent begins:

`CURRENT: PP-01`
