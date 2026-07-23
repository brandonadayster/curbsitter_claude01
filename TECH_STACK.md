# Technical Architecture

## Principle

Use current stable releases at bootstrap, commit the lockfile, and record exact versions in an ADR. Do not chase a named future version from old notes.

## Application

- Next.js App Router + React + strict TypeScript.
- Tailwind CSS with design tokens; accessible headless primitives where useful.
- Single repository and single deployable application for MVP.
- Route groups/modules for marketing, onboarding, customer, runner, admin, and API/webhooks.
- Server components by default; client components for forms, camera, offline queue, maps, and true interaction.

## Runtime and package management

- Node current active LTS.
- npm and committed `package-lock.json` and working `node_modules`.
- `.nvmrc` and `packageManager` field pinned after initialization.

## Data and identity

- Supabase managed Postgres.
- Supabase Auth.
- RLS on every customer/runner/admin table exposed through Supabase APIs.
- Supabase private Storage for property reference and proof photos.
- Database migrations committed in `supabase/migrations`.
- Local Supabase CLI for development when practical.

## Payments

- Stripe Billing for subscriptions.
- Stripe Customer Portal for billing self-service.
- Stripe Checkout or Payment Element selected during implementation based on the desired embedded flow.
- Verified, idempotent webhooks and event ledger.
- Monthly plans use approved Stripe payment methods. Quarterly plans are prepaid by ACH at the locked quarterly amounts; do not add a punitive card surcharge or stack another discount.

## Messaging

- Transactional email provider such as Resend or Postmark.
- Twilio for consented SMS.
- Database outbox table and retry worker/cron.
- Template IDs and consent state in the database.

## Maps and routing

- Address autocomplete/geocoding: Mapbox or Google Maps Platform.
- Store normalized address, provider place ID, latitude/longitude, and geocoding confidence.
- MVP routing: route-cell grouping, manual ordering, maps directions handoff, and actual-time capture.
- Later: vendor optimization or OR-Tools/route-optimization service only after route data and scale justify it.

## Deployment and operations

- Vercel for web application.
- Supabase managed database/storage.
- Sentry for errors and performance.
- GA4 and Search Console for acquisition; privacy settings and consent as required.
- GitHub Actions for checks.
- Environment separation: local, preview/staging, production.

## Testing

- Vitest for domain and component logic.
- Testing Library for UI behavior.
- Playwright for end-to-end.
- axe-based automated accessibility checks plus manual keyboard/screen-reader review.
- Database/RLS tests with disposable test data.

## PWA/offline

- Installable manifest for runner experience.
- Minimal service worker/offline queue only for route/task shell, draft task actions, and photo upload retry.
- Never cache access codes, billing data, or signed photo URLs in persistent browser caches.

## Security

- Private buckets and signed URLs.
- Step-up verification for sensitive access details.
- Least-privilege runner data views.
- Application-layer encryption or managed secret mechanism for highly sensitive access data, with key rotation plan.
- CSP, secure headers, CSRF-aware patterns, rate limiting, bot protection on public forms, and webhook signature verification.
- No secrets in `NEXT_PUBLIC_*` except values explicitly safe for browsers.

## Suggested repository structure

```text
src/
  app/
    (marketing)/
    (auth)/
    (customer)/app/
    (runner)/runner/
    (admin)/admin/
    api/
  components/
  features/
    accounts/
    properties/
    eligibility/
    billing/
    scheduling/
    routes/
    visits/
    photos/
    exceptions/
    notifications/
    referrals/
  lib/
  server/
  styles/
supabase/
  migrations/
  seed/
tests/
docs/
```

Organize by domain, not by a giant pile of generic services.
