# API and Server Action Contract

Use Next.js route handlers/server actions behind typed domain services. Names below describe behavior; implementation may use server actions for authenticated UI and route handlers for external/webhook/mobile/offline boundaries.

## Public

- `POST /api/eligibility/check` - normalized address -> route-cell result.
- `POST /api/waitlist` - consented lead creation/update.
- `POST /api/referrals/resolve` - validate referral code without exposing advocate identity.
- `GET /api/public/config` - safe public plan/service/area configuration only.

## Onboarding

- `POST /api/onboarding/draft` - create short-lived draft after consent.
- `PATCH /api/onboarding/draft/:token` - update stages.
- `POST /api/onboarding/checkout` - create Stripe session/intent from server-calculated price.
- `POST /api/onboarding/complete` - finalize pending serviceability review after verified payment event.

The server recalculates price. Never trust client totals.

## Customer

- `GET /api/me`.
- `GET /api/accounts/:id/properties`.
- `GET/PATCH /api/properties/:id`.
- `POST /api/properties/:id/access/verify` - step-up challenge.
- `GET/PATCH /api/properties/:id/access` - scoped sensitive action.
- `GET /api/properties/:id/cycles`.
- `GET /api/tasks/:id/photos/:photoId/url` - authorized short-lived signed URL.
- `POST /api/subscriptions/:id/pause|resume|cancel-request`.
- `POST /api/billing/portal`.
- `PATCH /api/notification-preferences`.
- `POST /api/orders/quote-request`.
- `POST /api/support-tickets`.

## Runner

- `GET /api/runner/routes/today` - minimum route summary.
- `GET /api/runner/tasks/:id` - task-specific details and short-lived access reveal.
- `POST /api/runner/tasks/:id/start`.
- `POST /api/runner/tasks/:id/photo-upload-ticket` - pre-authorized object path/upload.
- `POST /api/runner/tasks/:id/complete` - idempotency key required.
- `POST /api/runner/tasks/:id/exception`.
- `POST /api/runner/offline/sync` - ordered idempotent event batch.
- `POST /api/runner/incidents`.

## Admin

- Serviceability review approve/decline/request-info.
- Route cell create/update/activate/capacity.
- Cycle generation and task generation.
- Route create/order/assign/publish/start/close.
- Exception assign/resolve/retry/communicate.
- Account/property/subscription support actions.
- Referral fraud/credit approval.
- Config change with audit entry.

## Webhooks

- `POST /api/webhooks/stripe` - verify signature, persist unique event, process idempotently.
- Messaging delivery-status callbacks - verify provider signature.

## Error model

Return a typed safe error with:

- stable code,
- user-safe message,
- correlation ID,
- retryable boolean,
- field errors when applicable.

Never return access details, provider raw payloads, stack traces, or secret-bearing metadata.
