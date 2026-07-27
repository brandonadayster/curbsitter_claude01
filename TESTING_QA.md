# Testing and QA Plan

## Quality gates

Every pull request runs formatting, lint, typecheck, unit tests, affected integration tests, build, and dependency/security checks. Main-branch release adds Playwright smoke tests and migration checks.

## Domain unit tests

- Home/Complete bin and collection-coverage limits; monthly versus prepaid-quarterly server pricing; no stacked discounts.
- Route-cell eligibility and capacity.
- Referral qualifying/credit/fraud states.
- Collection cycle and task transitions.
- Pause/cancel cutoffs.
- Hauler-delay/recheck rules.
- Role and permission decisions.

## Integration tests

- RLS for customer, caregiver, runner, support, dispatcher, admin.
- Private object upload and signed URL authorization/expiry.
- Stripe signature verification, duplicate events, out-of-order events, failed processing retry.
- Notification outbox retry/deduplication.
- Access-secret reveal and audit.
- Offline runner sync idempotency.

## End-to-end journeys

- Active address -> self signup -> pending review -> approval.
- Buy for parent with separate payer/recipient/notifications.
- Waitlist -> referral share -> route opening.
- Capacity full/unavailable outcomes.
- Customer edits instructions and manages billing.
- Runner rollout proof -> return proof -> customer history.
- Gate failure -> secure update -> retry/close.
- Hauler missed -> delayed cycle -> recheck.
- Payment failure and pause/cancel around generated tasks.
- CurbSitter onDemand active-route/capacity flow.

## Accessibility and device matrix

- Keyboard-only public/onboarding/customer/admin.
- Screen reader smoke for labels, errors, status, and image alternatives.
- Reduced motion and zoom to 200%.
- Mobile Safari/Chrome current, common midrange Android dimensions, desktop Chromium/Firefox/Safari.
- Bright-light visual check for runner screens.

## Security QA

- No public buckets.
- No object enumeration.
- No cross-tenant IDs.
- No secrets in browser bundle, logs, analytics, error events, notification payloads, or screenshots.
- Rate limits/bot protection.
- Authorization tests use direct API calls, not only UI.

## Operational acceptance

Run a synthetic shadow route with at least ten properties covering standard, gate, steep/long, missing bin, hauler delay, poor signal, and unsafe-condition cases. Measure taps, task time, photo failures, and support needs.
