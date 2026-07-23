# Production Content Readiness Checklist — DRAFT

> Resolves P7-04. Everything that must be real (not placeholder) before the site
> goes public. Ties to Decision D-015 (no fabricated content).

## Infrastructure / config

- [ ] Domain **curbsitter.com** hosting + DNS configured; `NEXT_PUBLIC_APP_URL`
      set to `https://www.curbsitter.com` in production.
- [ ] **support@curbsitter.com** mailbox + email provider (Resend/Postmark) with
      SPF/DKIM/DMARC; `EMAIL_FROM` set; outbox worker cron enabled.
- [ ] Stripe **live** keys + live webhook endpoint + `STRIPE_WEBHOOK_SECRET`
      (currently test).
- [ ] Twilio A2P 10DLC campaign approved before enabling SMS sending.
- [ ] `ACCESS_SECRETS_KEY`, `CRON_SECRET` set in production and vaulted.
- [ ] Sentry DSN + GA4 (with privacy filtering that excludes addresses, access
      details, names, phones, and photo URLs).
- [ ] Supabase production project (separate from local/staging) with PITR.

## Content — must be real

- [ ] Route cells and their statuses reflect **actual** coverage (no invented
      availability). Address checker verified against real cells.
- [ ] Legal pages replaced with counsel-finalized versions; draft banners removed.
- [ ] Contact info correct everywhere (phone, email, domain).
- [ ] Founder story / "why us" content written and true.
- [ ] Real, licensed imagery (Prescott homes/slopes/bins, seniors without
      condescension, real product screens). **No AI-generated people passed off as
      customers.**
- [ ] Testimonials/reviews components stay hidden until **real, approved** reviews
      exist.
- [ ] Insurance status shown only once verified.
- [ ] Prescott collection/holiday schedule references sourced and date-stamped.
- [ ] FAQ answers match final policies (pause/cancel cutoff, refunds, SLA).
- [ ] Pricing displays match locked config (already enforced via `business.ts`).

## SEO / technical

- [ ] Unique titles/descriptions; one H1 per page (largely done).
- [ ] Structured data (LocalBusiness/Service/FAQ) added **only where truthful**.
- [ ] `sitemap.xml` / `robots.txt` point at the production domain.
- [ ] Google Business Profile created/verified consistently with the site.

## Final pre-launch

- [ ] Full CI green (lint/typecheck/unit/integration/build/e2e).
- [ ] Security review items addressed (see `docs/SECURITY_REVIEW.md`).
- [ ] Backup/restore drill passed.
- [ ] Owner sign-off recorded.
