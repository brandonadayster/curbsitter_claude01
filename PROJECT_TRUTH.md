# CurbSitter Project Truth

**Status:** Authoritative source of truth  
**Version:** 1.0  
**Effective date:** 2026-07-12  
**Owner:** CurbSitter founder  

## Authority order

When documents conflict, follow this order:

1. `PROJECT_TRUTH.md`
2. `DECISION_REGISTER.md`
3. `BUSINESS_CONFIG.md`
4. `PRD.md`
5. `APP_FLOW.md`
6. `TECH_STACK.md`, `DATA_MODEL.md`, `API_CONTRACT.md`
7. Remaining project documents

Never revive an older idea because it appears in a prototype, chat export, archive, screenshot, or competitor example. Open an ADR and ask the owner to change a locked decision instead.

## One-sentence business

CurbSitter is Prescott's local trash-day concierge: we roll household trash and recycling bins to the curb before collection, return them after collection, and photo-confirm every visit.

## Core promise

**Trash day, handled.**  
**Bins out. Bins back. Photo-confirmed.**

## What customers buy

Customers are not buying waste hauling. They are buying reliability, physical safety, HOA compliance, convenience, remote oversight, and freedom from a recurring deadline.

## Launch market

- Launch geography: selected route cells in Prescott, Arizona.
- Public availability must be address- and route-cell-based, not zip-code-only.
- Prescott Valley, Chino Valley, Dewey-Humboldt, and the wider Yavapai County area are expansion/waitlist markets until an administrator activates a route cell.
- A zip code may contain open, waitlisted, premium-quote, and unavailable addresses at the same time.

## Primary customers

1. Seniors and mobility-limited homeowners.
2. Adult children and caregivers purchasing for someone else.
3. Snowbirds, travelers, and second-home owners.
4. Short-term and long-term rental owners and property managers.
5. HOAs and community managers.
6. Busy or forgetful homeowners.

## Locked launch service model

### CurbSitter Home - $59/month or $159/quarter prepaid by ACH

- Up to 3 bins at one residential address.
- One regular collection day each week.
- Trash and recycling are included when they fall on the covered collection day.
- Rollout before collection and return after collection.
- Photo confirmation every visit, exception alerts, holiday monitoring, HOA timing instructions, dashboard, and service history.

### CurbSitter Complete - $89/month or $240/quarter prepaid by ACH

- Up to 6 bins at one residential address.
- Every regular trash and recycling collection day at the address.
- All Home service standards and proof.
- Intended for separate collection days, second homes, vacation rentals, and customers who want every routine collection handled.

### Community & Portfolio - custom proposal

- Custom route pricing, centralized controls, and reporting for HOAs, condo associations, property managers, and multi-property accounts.
- Resident opt-in, selected pilot, or contracted portfolio/community structures.

### One-Time Trash Day - $39

- One scheduled rollout and post-collection return for up to 3 bins.
- Active route and scheduling capacity required.
- Same proof and exception standards as subscriptions.

### Bulk Pickup Coordination - starting at $49

- Review item photos, coordinate an eligible provider appointment, provide placement instructions, and monitor the scheduled pickup.
- Physical curb placement is separately reviewed and quoted.
- No transport, disposal, junk hauling, demolition, hazardous-material handling, or guarantee that the provider accepts/collects the items.

### Included subscription benefits and boundaries

- Photo confirmation every visit, real-time exceptions, holiday schedule monitoring, normal HOA timing instructions, dashboard/history, and no separate photo/recycling/holiday/dashboard fee.
- Minor javelina/wind reset discovered during scheduled service is included only for an immediate minor condition.
- No long-term contract; customers may pause or cancel a future renewal under published cutoff rules.
- Home Watch, Host Shield, and other experimental property-concierge services are excluded from the public launch offer.

## Pricing guardrail

The public website must stay simple. Do not turn driveway length, gates, garages, grade, animals, or access into a Cheesecake Factory menu. The onboarding flow may detect complexity and either include the cost automatically, request a property review, or present a single clearly explained service adjustment. No surprise charges after checkout.

The prices above are locked by the owner-supplied 2026-07-13 pricing package and must live in one typed configuration source. The agent may not silently publish different numbers, rename Complete back to Plus, or stack additional discounts.

## Standard service windows

- Rollout: evening before collection; default planning window 5:00 p.m.-10:00 p.m.
- Return: after confirmed collection; target by the end of pickup day, with a published next-day fallback window when collection is delayed.
- Never promise an exact arrival time unless a separate premium dispatch product is later approved.

## Every visit produces a status

A visit may not disappear into "probably done." Valid outcomes include:

- Completed.
- Blocked access.
- Bin unavailable or not found.
- Hauler did not collect.
- Unsafe condition.
- Weather delay.
- Animal hazard.
- Customer cancellation or pause.
- Address or schedule mismatch.
- Other documented exception.

## Proof standard

- A rollout photo and a return photo are required for a normal collection cycle.
- Photos are stored privately.
- Customers receive time-limited signed access, not permanent public URLs.
- No continuous worker tracking is required for MVP. Capture location at task submission only when permission is available and operationally justified.

## Route-density rule

CurbSitter is a route-density business disguised as a convenience service. An address is accepted only when it fits an active route, improves a planned route, or pays an approved premium that covers the extra time and miles. The software must not accept every technically valid address.

Route activation is based on estimated contribution and capacity, not a magical neighbor count. The marketing UI may show progress toward activation, but the threshold must be configurable and administrator-approved.

## Customer experience rules

- Address check before the full form.
- Four short onboarding stages with visible progress.
- Support purchase for self or someone else.
- Capture payer, service recipient, and notification recipients separately.
- Capture bins, collection day(s), bin location, access notes, terrain, gate/garage requirements, animals, and photo consent.
- Show monthly versus prepaid-quarterly price, payment method, total charge, renewal cadence, and recurring terms before payment.
- Admin review before the first service is scheduled.
- Easy pause, cancellation, instruction updates, billing management, and proof history.

## Referral and waitlist rules

- Core offer: Give $10, Get $10 (revised 2026-07-27, was Give $20/Get $20) after a referred customer completes the qualifying event defined in configuration.
- Credits are not cash, are not transferable, and need fraud controls and a billing-cycle cap.
- Waitlisted leads receive a personal sharing link and route-progress updates.
- Never promise a route will open "tomorrow" solely because a referral count was reached.
- Never display fabricated live customer counts, route counts, reviews, ratings, or testimonials.

## Brand and design

- Deep onyx base, midnight navy surfaces, electric cyan primary action, restrained warm accent, high-contrast white text.
- Large, readable sans-serif typography designed for a 65+ audience.
- Premium and local, not corporate-industrial and not juvenile.
- Glass effects are restrained. Accessibility, contrast, speed, and legibility beat decorative glow.
- Real Prescott properties, bins, slopes, pine/high-desert context, and real proof UI are preferred over generic garbage imagery.

## Scope exclusions

Not part of the launch product unless the owner creates a new approved decision:

- Home Watch, Host Shield, or other experimental property-concierge services in public launch.
- Residential pet-waste removal.
- Junk hauling or waste transport.
- Municipal or private trash collection.
- Can cleaning as a self-performed service.
- Landscaping, maid service, handyman work, package concierge, HVAC testing, repairs, or full property management.
- Native iOS/Android apps.
- Custom vehicle-routing optimization.
- AI-generated HOA legal defenses.
- Public photo buckets.
- Automatic post-service surcharges without prior customer approval.
- Fake testimonials, fake counters, fake route activity, or invented service coverage.

## Product priority

1. Admin and runner reliability.
2. Address validation, route-cell controls, and onboarding.
3. Billing and notifications.
4. Customer portal.
5. Marketing polish and expansion features.

The runner/admin system is the engine. The marketing site is the sales engine. A native consumer app is not required for launch.
