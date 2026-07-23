# Customer Service Hours & Response Targets — DRAFT

> Resolves OPEN_DECISIONS #9. These become the promises on the Contact/FAQ pages
> and in support auto-replies, so set them only as high as you can reliably meet.

## Hours (draft — owner to set)

- **Support hours:** `[Mon–Fri, 8:00 a.m.–5:00 p.m. MST (Arizona; no DST)]`.
- **After-hours:** messages received outside hours are handled the next business
  day. Safety incidents are escalated per the Incident Response Plan.

## Channels

- Email: support@curbsitter.com (primary, tracked as support tickets).
- Phone/text: (520) 225-9713 `[voicemail after hours]`.
- In-app: support tickets from the customer dashboard.

## Response targets (draft)

| Request type | First response target | Resolution target |
|---|---|---|
| Service exception (active issue) | `[Same business day]` | `[Next service cycle]` |
| Billing question | `[1 business day]` | `[2–3 business days]` |
| General inquiry / lead | `[1 business day]` | — |
| Serviceability review outcome | `[1 business day]` after signup | — |
| Safety incident | Immediate escalation | Per incident plan |

## Service-recovery commitments

- A missed or disputed covered visit gets evidence review, a clear remedy
  (credit/make-good), and root-cause classification. Credits are not automatic
  guilt; denials are not automatic defensiveness.
- Keep the customer informed with honest status (including hauler delays).

## Operational notes

- Support tickets and their status are already in the product
  (`/app/support`, `/admin/support`). Wire an auto-acknowledgement email through
  the outbox once the mailbox is provisioned.
- Track "support contacts per 100 cycles" as a health metric (already in the KPI
  plan).

## Owner to confirm

- Exact hours, targets, and who staffs each channel at launch.
