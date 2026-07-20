# CurbSitter

CurbSitter is a route-density-first trash-day concierge platform for Prescott, Arizona. The product combines a high-conversion local website, address/route-cell qualification, subscription billing, a customer portal, a mobile runner workflow, and an admin operations console.

## Read first

1. `PROJECT_TRUTH.md`
2. `DECISION_REGISTER.md`
3. `BUSINESS_CONFIG.md`
4. `PRICING_SERVICE_MODEL.md`
5. `PRD.md`
6. `IMPLEMENTATION_PLAN.md`
7. `TODO.md`

Do not start coding until those files are read.

## Repository goal

Build one production-grade web application with route groups for:

- Public marketing and local SEO.
- Onboarding and waitlist.
- Customer portal.
- Runner PWA.
- Admin operations.

## Recommended initial stack

- Current stable Next.js App Router, React, TypeScript, and Tailwind CSS.
- Node current active LTS; pin the exact version in `.nvmrc` after initialization.
- pnpm with a committed lockfile.
- Supabase Postgres/Auth/Storage with RLS.
- Stripe Billing, Checkout/Payment Element as appropriate, and Stripe Customer Portal.
- Transactional email provider; Twilio only for consented SMS.
- Mapbox or Google for address search/geocoding and map display.
- Vercel, Sentry, GA4/Search Console, and privacy-conscious session analytics.
- Vitest, Playwright, TypeScript, linting, and automated accessibility checks.

Use current stable releases at bootstrap, then lock exact versions. Do not invent a future framework version because an old note mentioned it.

## Project commands after scaffold

Expected commands once the application is initialized:

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

## Working method

- One ticket at a time.
- Small commits with passing checks.
- No new production dependency without documenting why.
- No hidden business-rule changes.
- Update `TODO.md`, tests, and relevant docs in the same change.
- Use feature flags for unapproved or incomplete customer-facing features.

## Definition of done

A ticket is done only when acceptance criteria pass, tests are added or updated, mobile and keyboard behavior is checked, security implications are reviewed, documentation is current, and no fake content or placeholder claims reach production.

## Pricing implementation assets

The owner-supplied pricing package is preserved under `implementation_assets/pricing-package/`. Use it as the copy/layout reference, but read amounts and limits from typed configuration rather than hardcoding them in components.
