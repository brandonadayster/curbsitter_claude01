# Pricing and Service Model - Implementation Contract

**Status:** Authoritative implementation detail  
**Effective date:** 2026-07-15  
**Source:** Owner-supplied `curbsitter-pricing-package.zip` dated 2026-07-13

This file translates the locked pricing/service package into build rules. It does not outrank `PROJECT_TRUTH.md`, `DECISION_REGISTER.md`, or `BUSINESS_CONFIG.md`; it expands them.

## Public offer

| Offer | Price | Coverage |
|---|---:|---|
| CurbSitter Home | $59 monthly or $159 quarterly prepaid by ACH | Up to 3 bins; one regular collection day/week |
| CurbSitter Complete | $89 monthly or $240 quarterly prepaid by ACH | Up to 6 bins; every regular collection day at the address |
| Community & Portfolio | Custom proposal | HOA, condo, property manager, and multi-property route pricing/reporting |
| One-Time Trash Day | $39 | One rollout and return; up to 3 bins; active route/capacity only |
| Bulk Pickup Coordination | Starting at $49 | Item review, eligible appointment coordination, instructions, and pickup monitoring |

Quarterly pricing is the actual prepaid quarterly charge, never a fake monthly equivalent. Public copy may say "Save 10%" as supplied by the owner package. Do not stack another ACH, autopay, or quarterly discount.

## Included in subscriptions

- Rollout before every covered collection.
- Return after every covered collection.
- Photo confirmation every visit.
- Real-time exception reporting.
- Holiday schedule monitoring.
- Normal property-specific HOA timing instructions.
- Minor javelina/wind reset found during a scheduled visit.
- Customer dashboard and service history.
- Trash and recycling within covered collection days.
- Blocked-access and uncollected-bin reporting.
- No long-term service contract.
- Pause or cancel a future renewal online.
- No separate photo, holiday, recycling, or dashboard fee.

## Service boundaries

- Home covers one regular weekly collection day. Trash and recycling are both included when they occur on that covered day.
- Complete covers all regular trash and recycling collection days at the address.
- Standard prices assume ordinary, safe residential access. Unusual distance, grade, restricted entry, shared bins, or materially greater labor triggers review or custom quote.
- The minor javelina/wind reset is limited to uprighting a bin, recovering a minor immediate spill, and documenting the correction during an already scheduled visit.
- Widespread debris, hazards, excessive cleanup, or a separate dispatch is outside standard service.
- Bulk Pickup Coordination does not promise provider acceptance or collection. Physical item placement is separately quoted and may be unavailable.
- No waste transport, disposal, junk hauling, hazardous materials, security monitoring, inspection, or full property management.

## Public presentation

- Homepage: lead with Home and Complete, then Community & Portfolio. Mention the included benefits. Link to `/pricing` for details.
- `/pricing`: show monthly/quarterly toggle, both subscription cards, Community & Portfolio, included benefits, one-time services, and consolidated guidelines.
- One-Time Trash Day and Bulk Pickup Coordination stay below the subscription offer.
- Do not publish Home Watch, Host Shield, or other experimental services in the launch navigation or pricing cards.

## Implementation assets

The exact owner-supplied HTML/CSS/JS and Next.js examples are preserved under `implementation_assets/pricing-package/`. Translate them into the active design system; do not copy hardcoded prices into multiple components. Every displayed amount and rule must come from typed public configuration returned by the server.
