# AGENTS.md - CurbSitter Agent Contract

## Mission

Build the smallest reliable system that can sell and operate CurbSitter without making promises the field operation cannot keep.

## Mandatory startup sequence

Before changing code:

1. Read `PROJECT_TRUTH.md`, `DECISION_REGISTER.md`, `BUSINESS_CONFIG.md`, `PRICING_SERVICE_MODEL.md`, `PRD.md`, `APP_FLOW.md`, and `TODO.md`.
2. Inspect the repository and current tests.
3. Identify the single ticket being executed.
4. State assumptions in the ticket or an ADR; never bury them in code.
5. Create a Git checkpoint.

## Authority and conflicts

- The authority order in `PROJECT_TRUTH.md` is binding.
- Old chat exports, screenshots, prototypes, archive files, competitor pages, and generated copy are reference material only.
- When source material conflicts, do not merge the ideas. Use the higher-authority decision.
- Do not change pricing, service scope, service areas, policies, or public claims without updating `DECISION_REGISTER.md` and receiving owner approval.

## Hard boundaries

Never add or imply:

- Home Watch, Host Shield, or unrelated concierge services in public launch.
- Residential pet-waste service.
- Junk hauling, trash transport, or municipal collection.
- Public proof-photo storage.
- Fake testimonials, reviews, route counts, waitlist counts, or activity feeds.
- Exact arrival-time guarantees.
- Unapproved automatic surcharges.
- Native mobile apps or custom route optimization during MVP.
- Legal, inspection, security, or emergency-response claims CurbSitter is not licensed to provide.

## Engineering rules

- TypeScript strict mode.
- Prefer server components; use client components only for real interactivity or browser APIs.
- Validate all external input at the boundary with a typed schema.
- Treat Stripe, Twilio, email, maps, and Supabase as unreliable external systems: idempotency, retries, timeouts, and observable failures are required.
- Use RLS plus server-side authorization. UI hiding is not access control.
- Store access instructions separately from ordinary property notes and redact them from logs, analytics, error reports, and notifications.
- Store photos in a private bucket and provide short-lived signed URLs after authorization.
- Webhook handlers must verify signatures and be idempotent.
- No secrets in source, client bundles, screenshots, fixtures, or seeded demo content.
- Never log full addresses with gate codes or travel status.
- Price and business configuration must come from one typed source, not repeated literals.

## Product rules

- Address qualification is route-cell-based.
- Successful payment does not bypass admin serviceability review.
- A collection cycle contains two task types: rollout and return.
- Completion requires the appropriate proof photo unless an authorized exception is recorded.
- Every failed or delayed task creates a visible exception and customer communication rule.
- Payer, service recipient, and notification recipients may be different people.
- SMS is off until explicit consent is recorded.

## UI rules

- Mobile first, especially onboarding and runner views.
- Minimum 16px body text; primary conversion and runner controls are larger.
- Strong contrast, obvious focus states, 44px minimum touch targets.
- Avoid animation that delays comprehension or action.
- Respect reduced-motion preferences.
- Do not use decorative glass or glow behind long-form text.
- Do not add emoji to the production interface unless explicitly approved.

## Testing requirements

For every behavior change, test the happy path and the most expensive failure path. At minimum:

- Unit tests for pricing, route eligibility, state transitions, and permissions.
- Integration tests for database policies, signed photo access, webhooks, and notifications.
- Playwright tests for address check, active signup, waitlist, buy-for-someone-else, billing portal, runner completion, and exception resolution.
- Accessibility checks for public pages and onboarding.
- Mobile viewport checks for runner and customer flows.

## Completion sequence

1. Run formatting, lint, typecheck, unit tests, integration tests, and relevant e2e tests.
2. Inspect the diff for leaked secrets, fake content, changed business rules, and accessibility regressions.
3. Update `TODO.md` and documentation incrementally, in the same commit as the code each entry describes — not batched at the end, where an interrupted session loses them.
4. Commit with the ticket ID and a plain description.
5. Summarize what changed, what was tested, and any remaining risk.
