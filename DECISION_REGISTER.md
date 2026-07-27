# Decision Register

| ID | Decision | Status | Why | Change control |
|---|---|---|---|---|
| D-001 | CurbSitter is a trash-day concierge focused on bin rollout and return. | Locked | Clearest offer and best route economics. | Owner ADR required. |
| D-002 | Brand promise: "Trash day, handled." Supporting line: "Bins out. Bins back. Photo-confirmed." | Locked | Short, memorable, explanatory. | Owner approval. |
| D-003 | Launch in selected Prescott route cells, not the whole zip code or county. | Locked | Density protects margin and reliability. | Operations data + owner approval. |
| D-004 | Public launch pricing (revised 2026-07-27): Home $65/month or $55/month billed quarterly ($165 every 3 months); Complete $85/month or $75/month billed quarterly ($225 every 3 months); CurbSitter onDemand $25 per service. Quarterly is a discounted per-month rate shown via the pricing toggle. | Locked (revised 2026-07-27) | Owner simplification adopting a Swoop-style tier structure with CurbSitter's own numbers; supersedes the 2026-07-13 package prices. | Owner ADR required. |
| D-005 | Every subscription includes rollout, return, photo confirmation every visit, exception reporting, holiday monitoring, dashboard history, and normal property-specific HOA instructions. | Locked | This is the differentiated core service. | Owner ADR required. |
| D-006 | Home Watch, Host Shield, and other experimental concierge services are excluded from the public launch offer. | Locked | Protects conversion and proves core route economics before adding scope. | Pilot data + owner ADR. |
| D-007 | Bulk Pickup Coordination and physical curb placement are removed from the product — public routes, pricing, config, feature flags, and admin tooling deleted. May be revisited later via a new ADR. | Retired (2026-07-27) | Owner simplification: the add-on was promise-heavy, diluted the core trash-day service, and added support/legal surface for little value at launch. | Owner ADR to reintroduce. |
| D-008 | Residential pet-waste service is retired. HOA common-area pet-waste work is deferred and excluded from MVP. | Locked | It dilutes the trash-day brand and operating model. | New business-case ADR only. |
| D-009 | Private photo storage with signed URLs. | Locked | Public property photos and access details are unacceptable. | Security review only. |
| D-010 | PWA/web applications first; no native apps at launch. | Locked | Faster, cheaper, and enough for camera/location workflows. | Usage data + ADR. |
| D-011 | Manual/assisted routing first; custom optimization later. | Locked | Do not build a math project before validating route economics. | Triggered by scale thresholds. |
| D-012 | Stripe Billing and Customer Portal handle recurring payments; quarterly plans are prepaid and renew every three months, payable by card or ACH, and are displayed as a discounted per-month rate via the pricing toggle. | Locked (revised 2026-07-27) | Reduces custom billing risk while preserving the approved quarterly offer; allowing card lowers signup friction. | Architecture ADR. |
| D-013 | Email is default; SMS is opt-in and transactional unless separate marketing consent exists. | Locked | Compliance and customer trust. | Legal review. |
| D-014 | Referrals are Give $20/Get $20 after a qualifying completed paid service, with anti-fraud controls. | Locked | High growth potential without paying for empty leads. | Owner confirms caps/expiration. |
| D-015 | Do not publish fake reviews, route counts, availability, social proof, or AI-created customer quotes. | Locked | Trust is the moat. | Never override. |
| D-016 | Deep onyx design remains, but legibility and restraint outrank glow effects. | Locked | Target audience includes older adults. | Design review. |
| D-017 | Pricing and operational rules are configuration-driven, not hardcoded in pages. | Locked | Prevents contradictory versions. | Never override. |
| D-018 | Admin approves the property before first service, even after successful payment. | Locked | Avoids operational surprises and unsafe access. | Operations review. |
| D-019 | Minor javelina/wind reset discovered during a scheduled visit is included; widespread debris, hazards, or separate dispatches require review or quote. | Locked | Adds practical value without creating open-ended cleanup work. | Operations/legal review. |
| D-020 | The public menu leads with Home and Complete; CurbSitter onDemand (one-time) is secondary; CurbSitter Enterprise (formerly Community & Portfolio) is a custom proposal. Bulk coordination is removed. | Locked (revised 2026-07-27) | Prevents option overload and keeps the core offer obvious. | Conversion data + owner ADR. |
| D-021 | Legal identity is CurbSitter, LLC; public contact is (520) 225-9713, support@curbsitter.com, curbsitter.com (canonical https://www.curbsitter.com). | Locked (owner-confirmed 2026-07-23) | Resolves OPEN_DECISIONS #1. Email mailbox and domain hosting are not yet provisioned. | Owner ADR. |
| D-022 | Referral credits have no monthly cap. | Locked (owner-confirmed 2026-07-23) | Resolves the cap portion of OPEN_DECISIONS #6; expiration, tax treatment, and full fraud policy remain open. | Owner ADR. |
| D-023 | Quarterly pricing is displayed as a discounted per-month rate via an accessible toggle on the pricing cards — revising the prior "never a fake monthly equivalent" rule. The full quarterly charge is still disclosed on each card. "One-Time Trash Day" is renamed "CurbSitter onDemand" and "Community & Portfolio" is renamed "CurbSitter Enterprise" (display-only; internal ids `one_time_trash_day` / `community_portfolio` unchanged). | Locked (2026-07-27) | Owner-directed simplification and clearer price comparison, matching the canmonkey-style toggle the owner referenced. | Owner ADR. |

## Retired decisions

- Home $59/month·$159/quarter and Complete $89/month·$240/quarter (2026-07-13 package prices); superseded by D-004 revision 2026-07-27.
- Bulk Pickup Coordination and physical curb placement as a public service (see D-007 retired 2026-07-27).
- Quarterly displayed only as the literal quarterly charge with no per-month equivalent (revised by D-023).
- Quarterly plans payable by ACH only (now card or ACH, D-012 revision 2026-07-27).

- Scoop2Go and BleepSweep branding.
- Dual trash-plus-residential-pet-waste business.
- Home $59 / Plus $69 with 2-bin and 4-bin limits.
- One-time rollout at $29 plus per-bin charges.
- Home Watch or Host Shield as public launch products.
- Bulk Day Set-Out presented as included physical item placement.
- $45/$59 competitor-derived quarterly-only pricing.
- Punitive card surcharges or stacked ACH/autopay/prepay discounts beyond the approved quarterly prices.
- Public Supabase proof bucket.
- "Uber Black of trash" as public-facing copy. Premium is a design standard, not a customer slogan.
- Automatic wildlife-cleanup or overflow charges beyond the included minor reset without explicit approval.
- Fifty photos on every route stop.
- AI HOA citation-defense generator.
- Exact-time service promises.
