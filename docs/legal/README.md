# CurbSitter Legal Drafts — For Counsel Review

> **THESE ARE DRAFTS. NOT LEGAL ADVICE.**
> Prepared by an AI coding assistant as a starting point for a licensed attorney.
> **Nothing in this folder may be published, presented to customers, or relied
> upon until reviewed, corrected, and approved by an attorney licensed in
> Arizona.** Insurance-related content additionally requires a licensed broker.

## How to use this folder

1. Have Arizona counsel review each document, fill every `[BRACKETED PLACEHOLDER]`,
   and resolve every `> COUNSEL:` note.
2. Counsel returns final versions.
3. Engineering wires the finalized text into the app's legal pages
   (`src/app/(marketing)/terms`, `/privacy`, `/sms-terms`, `/accessibility`),
   removing the "draft — under legal review" banners at that time.

The app currently ships **short placeholder legal pages with a visible draft
banner**; these longer drafts are the intended replacement source.

## Confirmed business facts (as of 2026-07-23)

| Field | Value |
|---|---|
| Legal entity | CurbSitter, LLC |
| Market | Prescott, Arizona (Yavapai County) |
| Phone | (520) 225-9713 |
| Email | support@curbsitter.com *(mailbox not yet provisioned)* |
| Website | https://www.curbsitter.com *(hosting not yet provisioned)* |

## Documents

| File | Purpose |
|---|---|
| `terms-of-service.draft.md` | Master service agreement / terms of use |
| `privacy-policy.draft.md` | Data collection, use, retention, rights |
| `sms-terms.draft.md` | SMS/text messaging program terms + exact opt-in language |
| `ach-authorization.draft.md` | NACHA-aware ACH debit authorization (quarterly prepay) |
| `referral-program-terms.draft.md` | Give $20 / Get $20 official rules |
| `accessibility-statement.draft.md` | WCAG 2.2 AA commitment and contact |
| `electronic-communications-consent.draft.md` | E-SIGN consent snippet used at checkout |

## Non-negotiable constraints these drafts already honor

These come from `PROJECT_TRUTH.md` / `DECISION_REGISTER.md` and must survive
legal review — flag to counsel if any edit would break them:

- No exact arrival-time guarantees; CurbSitter sells a completion **window**.
- No guarantee of hauler collection or HOA compliance outcomes.
- CurbSitter does **not** haul, transport, or dispose of waste.
- Proof photos are **private**; no public galleries; short-lived signed access only.
- Access codes/instructions are stored separately, encrypted, and never sent in
  plain SMS/email.
- No fabricated reviews, counts, availability, or testimonials.
- Payment does not bypass admin serviceability review before first service.
