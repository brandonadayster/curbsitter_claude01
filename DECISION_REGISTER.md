# Decision Register

| ID | Decision | Status | Why | Change control |
|---|---|---|---|---|
| D-001 | CurbSitter is a trash-day concierge focused on bin rollout and return. | Locked | Clearest offer and best route economics. | Owner ADR required. |
| D-002 | Brand promise: "Trash day, handled." Supporting line: "Bins out. Bins back. Photo-confirmed." | Locked | Short, memorable, explanatory. | Owner approval. |
| D-003 | Launch in selected Prescott route cells, not the whole zip code or county. | Locked | Density protects margin and reliability. | Operations data + owner approval. |
| D-004 | Public launch pricing is Home $59/month or $159/quarter prepaid by ACH; Complete $89/month or $240/quarter prepaid by ACH. | Locked | Owner-supplied pricing package dated 2026-07-13 supersedes earlier pricing drafts. | Owner ADR required. |
| D-005 | Every subscription includes rollout, return, photo confirmation every visit, exception reporting, holiday monitoring, dashboard history, and normal property-specific HOA instructions. | Locked | This is the differentiated core service. | Owner ADR required. |
| D-006 | Home Watch, Host Shield, and other experimental concierge services are excluded from the public launch offer. | Locked | Protects conversion and proves core route economics before adding scope. | Pilot data + owner ADR. |
| D-007 | Bulk Pickup Coordination starts at $49; physical curb placement is a separately reviewed quote and CurbSitter never hauls or disposes. | Locked | Keeps the public offer useful without implying junk removal. | Legal/insurance review. |
| D-008 | Residential pet-waste service is retired. HOA common-area pet-waste work is deferred and excluded from MVP. | Locked | It dilutes the trash-day brand and operating model. | New business-case ADR only. |
| D-009 | Private photo storage with signed URLs. | Locked | Public property photos and access details are unacceptable. | Security review only. |
| D-010 | PWA/web applications first; no native apps at launch. | Locked | Faster, cheaper, and enough for camera/location workflows. | Usage data + ADR. |
| D-011 | Manual/assisted routing first; custom optimization later. | Locked | Do not build a math project before validating route economics. | Triggered by scale thresholds. |
| D-012 | Stripe Billing and Customer Portal handle recurring payments; quarterly plans are prepaid by ACH and renew every three months. | Locked | Reduces custom billing risk while preserving the approved quarterly offer. | Architecture ADR. |
| D-013 | Email is default; SMS is opt-in and transactional unless separate marketing consent exists. | Locked | Compliance and customer trust. | Legal review. |
| D-014 | Referrals are Give $20/Get $20 after a qualifying completed paid service, with anti-fraud controls. | Confirm before publish | High growth potential without paying for empty leads. | Owner confirms caps/expiration. |
| D-015 | Do not publish fake reviews, route counts, availability, social proof, or AI-created customer quotes. | Locked | Trust is the moat. | Never override. |
| D-016 | Deep onyx design remains, but legibility and restraint outrank glow effects. | Locked | Target audience includes older adults. | Design review. |
| D-017 | Pricing and operational rules are configuration-driven, not hardcoded in pages. | Locked | Prevents contradictory versions. | Never override. |
| D-018 | Admin approves the property before first service, even after successful payment. | Locked | Avoids operational surprises and unsafe access. | Operations review. |
| D-019 | Minor javelina/wind reset discovered during a scheduled visit is included; widespread debris, hazards, or separate dispatches require review or quote. | Locked | Adds practical value without creating open-ended cleanup work. | Operations/legal review. |
| D-020 | The public menu leads with Home and Complete; one-time and bulk coordination remain secondary, while Community & Portfolio is custom proposal. | Locked | Prevents option overload and keeps the core offer obvious. | Conversion data + owner ADR. |

## Retired decisions

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
