# Implementation Plan

## Phase 0 - Freeze truth and initialize

- Confirm publication locks in `BUSINESS_CONFIG.md`.
- Initialize Git, branch protections, issue/ticket convention, and environment separation.
- Scaffold current stable Next.js/TypeScript/Tailwind with pnpm.
- Add CI for format/lint/typecheck/unit/build.
- Configure local Supabase and migration workflow.
- Add Sentry/analytics stubs with privacy filtering.

**Exit:** reproducible local setup, CI passes, no customer data or production credentials.

## Phase 1 - Data, identity, security

- Core migrations, enums, indexes, RLS, audit/event patterns.
- Auth roles and account/property membership.
- Private storage and signed-photo authorization.
- Access-secret isolation and step-up design.
- Synthetic seed data.

**Exit:** RLS tests prove no cross-account/runner leakage; public bucket does not exist.

## Phase 2 - Public website, eligibility, waitlist

- Design system and public shell.
- Homepage/how/pricing/areas/audience/FAQ/legal pages using `PRICING_SERVICE_MODEL.md` and the supplied pricing implementation assets.
- Address autocomplete, normalization, route-cell engine, result states.
- Waitlist, referral code, consent, and safe analytics.
- Admin route-cell management.

**Exit:** active, waitlist, review, full, and unavailable paths work on mobile and are truthful.

## Phase 3 - Onboarding and billing

- Four-stage onboarding and draft handling.
- Account/contact/property/bin/schedule/access intake.
- Server-side Home/Complete monthly-versus-quarterly pricing, ACH-prepay rules, one-time pricing, and serviceability review state.
- Stripe customer/subscription/payment and webhooks.
- Consent records and welcome/review-needed emails.

**Exit:** test payment creates a pending-review account exactly once; duplicate webhooks are harmless.

## Phase 4 - Admin scheduling and runner MVP

- Serviceability review queue.
- Cycle/task generation.
- Route builder/order/assignment/publish.
- Runner route/task UI, proof capture/compression/upload/retry.
- Task/cycle state machine, exception and incident flows.

**Exit:** a full rollout-return cycle can be planned, completed, photo-proven, and reviewed from phones.

## Phase 5 - Customer portal and notifications

- Dashboard, properties/instructions/access update.
- Service history and signed photos.
- Exceptions, pause/resume/cancel request.
- Stripe Customer Portal.
- Notification preferences, outbox/retries, consented SMS.
- Support tickets.

**Exit:** customer self-service covers the common reasons to call.

## Phase 6 - Referrals, one-time services, reporting

- Referral lifecycle/credits/fraud review.
- One-Time Trash Day order flow restricted to active routes and capacity.
- Bulk Pickup Coordination request/authorization/status flow plus separately quoted physical placement.
- Route/cell financial-input dashboards and export.
- HOA/portfolio account/report basics.
- Keep Home Watch/Host Shield disabled unless a later owner ADR activates them.

**Exit:** growth features cannot create unapproved routes, charges, or scope.

## Phase 7 - Pilot hardening and launch

- Full QA, accessibility, mobile/offline, security, backup/restore, incident drills.
- Real policy/legal/insurance confirmation.
- Production content and real service areas.
- Runner training and shadow route.
- Soft launch, daily review, controlled capacity.

**Exit:** launch checklist signed by owner; metrics and rollback plans exist.

## Phase 8 - Data-led expansion

Only after pilot thresholds:

- Optimizer/vendor evaluation.
- Deeper HOA/portfolio features.
- Additional route cells/cities.
- Native app evaluation only if PWA evidence demands it.
