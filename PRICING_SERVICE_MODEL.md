# Pricing and Service Model - Implementation Contract

**Status:** Authoritative implementation detail  
**Effective date:** 2026-07-15  
**Source:** Owner-supplied `curbsitter-pricing-package.zip` dated 2026-07-13

This file translates the locked pricing/service package into build rules. It does not outrank `PROJECT_TRUTH.md`, `DECISION_REGISTER.md`, or `BUSINESS_CONFIG.md`; it expands them.

## Public offer

_Revised 2026-07-27 (D-004/D-012/D-023)._

| Offer | Price | Coverage |
|---|---:|---|
| CurbSitter Home | $65/month, or $55/month billed quarterly ($165 every 3 months) | Up to 3 bins; one regular collection day/week |
| CurbSitter Complete | $85/month, or $75/month billed quarterly ($225 every 3 months) | Up to 6 bins; every regular collection day at the address |
| CurbSitter Enterprise | Custom proposal | HOA, condo, property manager, and multi-property route pricing/reporting |
| CurbSitter onDemand | $25 per service | One rollout and return; up to 3 bins; active route/capacity only |

Quarterly billing is a **discounted per-month rate**: the price shown per month is `quarterly_price_cents / 3`, and the customer is charged the full `quarterly_price_cents` once every three months (prepaid, payable by card or ACH). The pricing cards use an accessible **Monthly/Quarterly toggle** that swaps each card's displayed per-month price; the full quarterly charge is always disclosed on the card. Public copy may say "Save up to 15%." Do not stack another autopay or quarterly discount. Bulk Pickup Coordination has been removed (D-007 retired).

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
- No waste transport, disposal, junk hauling, hazardous materials, security monitoring, inspection, or full property management.

## Public presentation

- Homepage: lead with Home and Complete, then CurbSitter Enterprise. Mention the included benefits. Link to `/pricing` for details.
- `/pricing`: show the monthly/quarterly toggle, both subscription cards, CurbSitter Enterprise, included benefits, the CurbSitter onDemand one-time service, and consolidated guidelines.
- CurbSitter onDemand stays below the subscription offer.
- Do not publish Home Watch, Host Shield, or other experimental services in the launch navigation or pricing cards.

## Implementation assets

The exact owner-supplied HTML/CSS/JS and Next.js examples are preserved under `implementation_assets/pricing-package/`. Translate them into the active design system; do not copy hardcoded prices into multiple components. Every displayed amount and rule must come from typed public configuration returned by the server.
