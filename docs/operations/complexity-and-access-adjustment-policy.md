# Complexity & Access-Adjustment Policy — DRAFT

> Resolves OPEN_DECISIONS #4. Config touchpoint: the onboarding hazard flags and
> `buildQuote` review-trigger set in `src/lib/pricing.ts`
> (`REVIEW_HAZARDS`). No field surcharges — ever (PROJECT_TRUTH no-surprise rule).

## Principle

Published prices assume ordinary residential access. Harder access is handled by
**either** (a) including it at standard price when it fits the route, **or**
(b) a single, clearly explained adjustment shown and accepted **before**
activation, **or** (c) a property review / decline. There are no surprise or
field-created charges.

## Complexity factors and how they're handled

| Factor | Definition (draft) | Handling |
|---|---|---|
| Long driveway | `[> 150 ft]` from storage to curb | Access review; include if route time OK, else adjustment |
| Steep grade | `[> 10%]` or icy in winter | Access review; safety stop rules apply |
| Stairs | `[> 3]` steps between storage and curb | Access review |
| Gate | Coded/locked gate on the access path | Standard if code provided; review if manned/complex |
| Garage retrieval | Bins stored inside a garage | Access review (time + access reliability) |
| Shared bins | Bins shared across units/neighbors | Review; may require Community/Portfolio terms |
| Isolated address | Off-cluster, adds significant drive time | Waitlist or premium-review cell |
| Animals | Dog/other on the access path | Review; unsafe-animal = decline until secured |

## Adjustment ranges (draft — owner to set)

- Recommended model: **one flat monthly access adjustment tier**, not per-factor
  stacking, to keep the offer simple.
  - Tier A (minor): `[+$__/mo]`
  - Tier B (significant): `[+$__/mo]`
  - Beyond Tier B: custom quote or decline.
- One-Time Trash Day: `[+$__]` flat if any Tier B factor, or decline.

## Process

1. Onboarding captures factors (already implemented as hazard flags).
2. `buildQuote` flags `requiresAccessReview` for gate/garage/steep/long/access-
   restriction (already implemented) — this **never** changes the price silently.
3. Admin review sets the approved adjustment (if any) and communicates it; the
   customer sees and accepts the final amount before activation.
4. If unsafe or uneconomical, decline with a clear explanation and offer waitlist
   or alternative.

## Owner to confirm

- The numeric thresholds and the adjustment tier amounts.
- Whether adjustments are monthly add-ons or one-time setup fees.
