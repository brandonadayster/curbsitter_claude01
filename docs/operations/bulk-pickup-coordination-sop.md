# Bulk Pickup Coordination SOP & Physical-Placement Limits — RETIRED

> **RETIRED 2026-07-27 (D-007 retired).** Bulk Pickup Coordination was removed
> from the product — the `/app/bulk-pickup` and `/admin/orders` routes, pricing,
> config, and feature flags were deleted. This SOP is kept for reference only in
> case the service is revisited later via a new ADR; it does not describe a live
> offer.

> _(Historical draft below.)_ Resolves OPEN_DECISIONS #5. Consistent with the
> Bulk Pickup flow that was built and later removed. Coordination only;
> CurbSitter never hauls or disposes.

## Scope

CurbSitter **coordinates** an eligible municipal or hauler bulk-pickup
appointment and monitors it. Physical placement of items at the curb, where
offered, is a **separate, admin-quoted** service with strict limits. We do not
transport, dispose, haul, demolish, or handle hazardous/refrigerant materials,
and we do not guarantee provider acceptance or collection.

## Coordination workflow

1. **Intake** (customer): item description/photos, property, preferred date,
   authorization to coordinate on their behalf. (Built.)
2. **Eligibility review** (admin): confirm the items fit an eligible provider
   bulk program; check provider rules (item types, counts, size/weight caps,
   scheduling windows, fees).
3. **Authorization capture:** record the customer's authorization and any provider
   account/reference needed. Do not act beyond the authorization.
4. **Schedule + instruct:** book the eligible appointment where rules allow;
   provide placement instructions and timing to the customer.
5. **Quote coordination fee:** from $49; set on the order (built).
6. **Monitor + close:** confirm the outcome; if the provider does not collect,
   report honestly and advise next steps. No fake completion.

## Provider-authorization checklist (per request)

- [ ] Provider identified and program confirmed eligible for these items.
- [ ] Item types allowed (no hazardous, refrigerant, hazmat, tires/`[per
      provider]`, construction debris beyond limits).
- [ ] Quantity/size/weight within provider caps.
- [ ] Any provider fees disclosed to the customer.
- [ ] Customer authorization on file.
- [ ] Appointment window fits an operable date.

## Physical-placement limits (if offered)

Physical placement is quoted **only** after review and must pass all of:

- Weight per item `[≤ __ lb]` and total `[≤ __ lb]`; two-person items flagged.
- No hazardous, refrigerant, sharp/contaminated, or illegal items.
- Safe access and terrain (see Complexity Policy); no unsafe lifting.
- Adequate staffing and time within the route/day.
- Within insurance coverage limits (confirm with broker; see Insurance Checklist).

Placement is a distinct `bulk_physical_placement` line item, admin-quoted, never
implied or auto-charged (already enforced in code).

## Hard exclusions

Hazardous materials, refrigerants/appliances requiring certified handling,
demolition/construction debris beyond provider limits, biohazards, and anything
illegal to place or transport.

## Owner to confirm

- Weight/quantity caps and any item categories to exclude locally.
- Whether physical placement is offered at launch or deferred.
- Provider list and their current bulk-program rules (date-stamped).
