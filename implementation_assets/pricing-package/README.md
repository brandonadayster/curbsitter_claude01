# CurbSitter Pricing Package

This package contains a compact homepage pricing section and a full `/pricing` page based on the simplified launch offer.

## Recommended public offer

- **CurbSitter Home:** $59/month or $159/quarter via prepaid ACH
- **CurbSitter Complete:** $89/month or $240/quarter via prepaid ACH
- **Community & Portfolio:** Custom quote
- **One-Time Trash Day:** $39
- **Bulk Pickup Coordination:** from $49

The public pages intentionally omit Host Shield, Home Watch and other experimental services. Those can be introduced later inside the customer dashboard or through audience-specific landing pages after the core route economics are proven.

## Preview files

- `preview/homepage-pricing-section.html` — standalone preview of the section to insert into the homepage
- `preview/pricing.html` — complete pricing page
- `preview/assets/pricing.css` — self-contained styling
- `preview/assets/pricing.js` — monthly/quarterly toggle

## Integration notes

1. Copy the `<section id="pricing">…</section>` markup from `homepage-pricing-section.html` into the homepage.
2. Load `pricing.css` in the site `<head>`.
3. Load `pricing.js` once near the closing `</body>` tag.
4. Publish `pricing.html` as `/pricing` or translate the supplied Next.js files into the active project.
5. Replace `/signup` and `/contact` links with the production onboarding routes if they differ.

## Intentional copy decisions

- “Trash and recycling” is tied to **covered collection days**, preventing Home from accidentally promising a second weekly route.
- Minor javelina/wind cleanup is included only when discovered during a scheduled visit.
- All operational limitations are consolidated under one guidelines section rather than repeated beneath every price card.
- Quarterly pricing is shown as the actual prepaid quarterly charge, not a misleading monthly equivalent.

## Next.js files

- `nextjs/components/PricingSection.tsx` — reusable client component for the homepage and pricing page
- `nextjs/app/pricing/page.tsx` — complete App Router `/pricing` page
- `nextjs/styles/curbsitter-pricing.css` — shared styles

Import the stylesheet once from the root layout for site-wide use, or from the pricing page plus the homepage containing `PricingSection`.
