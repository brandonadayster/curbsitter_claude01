# Product Requirements Document

## Objective

Create the operational and sales platform required to launch a reliable trash-bin rollout/return service in selected Prescott route cells. The product must increase conversion without accepting unprofitable or unsafe work.

## Product surfaces

1. Public website and local SEO pages.
2. Address availability and waitlist system.
3. Four-stage onboarding and payment.
4. Customer portal.
5. Runner PWA.
6. Admin operations console.
7. Notification, exception, billing, referral, and reporting services.

## Personas

- Homeowner managing their own property.
- Adult child or caregiver purchasing for a parent.
- Snowbird or second-home owner.
- Rental owner/property manager with multiple properties.
- HOA/community manager.
- Runner completing field work.
- Admin/dispatcher/support operator.

## MVP capabilities

### Public and acquisition

- Fast deep-onyx marketing site.
- Address autocomplete and route-cell eligibility.
- Active, waitlist, premium-review, unavailable, and capacity-full outcomes.
- Route-cell progress and referral sharing without fabricated data.
- Local SEO pages for actual markets and customer segments.
- Transparent plan, scope, service-window, cancellation, and exception language.

### Onboarding

1. Address and availability.
2. Customer/payer/recipient/contact details.
3. Property, bins, pickup schedules, access, hazards, and service choice.
4. Review, consent, payment, and admin-review expectation.

Requirements:

- Purchase for self or someone else.
- Multiple notification recipients.
- No account creation wall before address qualification.
- Save progress only with consent and secure tokenization.
- Total recurring and one-time charges displayed before payment.
- Payment success creates `pending_serviceability_review`, not automatic active service.

### Customer portal

- Next service and current account status.
- Property and bin instructions.
- Access details with step-up verification before reveal/edit.
- Service history and rollout/return photos.
- Exceptions and resolutions.
- Pause, resume, cancel, billing portal, notification preferences.
- Add-on request and support ticket.
- Referral link, earned/pending credits, and rules.
- Multi-property support.

### Runner PWA

- Today's assigned routes and stops.
- Large, sunlight-readable, glove-friendly controls.
- Directions handoff.
- Property and access instructions with least privilege.
- Start/arrive/complete/exception actions.
- Camera capture, compression, upload retry, and offline queue.
- Rollout/return-specific proof requirements.
- Unsafe-condition stop authority.
- No access to unrelated customer billing or account data.

### Admin console

- Leads, waitlist, customers, accounts, properties, subscriptions.
- Serviceability review queue.
- Route cells and activation/capacity states.
- Schedule and task generation.
- Manual route ordering and assignment.
- Live route/task status and exception queue.
- Customer communications and audit history.
- Referral and credit review.
- Metrics by route cell, collection day, route, and property complexity.

### Billing

- Stripe customer, subscription, invoices, payment method, and portal.
- Idempotent webhook processing.
- Configurable prices and credits.
- No card data stored by CurbSitter.
- No automatic discretionary surcharge without prior authorization.

### Notifications

- Transactional email by default.
- SMS only after consent.
- Templates for welcome, review needed, service scheduled, rollout completed, return completed, exception, hauler delay, payment issue, pause/cancel, and route opening.
- Outbox/retry architecture with delivery status.

## Service state model

A recurring collection schedule creates a collection cycle. A cycle ordinarily creates:

1. Rollout task.
2. Return task.

Cycle states:

- planned
- rollout_scheduled
- rolled_out
- collection_pending
- return_scheduled
- completed
- completed_with_exception
- delayed_by_hauler
- blocked
- cancelled

State transitions must be explicit, timestamped, attributable, and auditable.

## Nonfunctional requirements

- Public pages meet Core Web Vitals targets and WCAG 2.2 AA intent.
- Runner critical screens remain usable on a midrange phone in bright light and poor connectivity.
- Photo upload retries safely and does not duplicate records.
- Financial and webhook operations are idempotent.
- All privileged reads and writes are authorized server-side.
- RLS prevents cross-account and cross-role leakage.
- Production errors are observable without exposing sensitive data.

## MVP success criteria

- 95%+ collection cycles have both required proof outcomes or a documented exception.
- Preventable missed-service rate below 2% after pilot stabilization.
- 100% of access data is excluded from analytics and routine logs.
- Address checker never auto-activates an address outside an open/capacity-available route cell.
- A new runner can complete a normal stop from the PWA without verbal coaching.
- A customer can update instructions, view proof, manage billing, pause, and cancel without calling.
- Admin can identify open exceptions and route profitability inputs in one place.

## Out of scope for MVP

See `PROJECT_TRUTH.md`. Any scope expansion requires an ADR, owner approval, and an implementation phase after the core pilot is stable.
