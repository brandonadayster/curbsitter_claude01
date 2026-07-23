# Referral Operational Policy — DRAFT

> Resolves the operational parts of OPEN_DECISIONS #6 (cap already resolved: no
> cap). Pairs with `docs/legal/referral-program-terms.draft.md`. Reflects the
> built flow: pending accrual → admin review → earned.

## Lifecycle (implemented)

`pending` (on qualifying first paid cycle) → admin **approve** → `earned`
(spendable) or admin **reject** → `reversed`. States also include `applied` (used
against billing) and `expired`.

## Fraud-review workflow

The system automatically flags a referral for review when it detects any of:
- self-referral (same account),
- shared payment method between advocate and referred account,
- shared service address, or
- shared payer email.

Admin steps in `/admin/referrals`:
1. Review flagged and clean referrals awaiting approval.
2. **Approve** clean referrals → credits become `earned`.
3. **Reject** abusive referrals → credits `reversed`, referral marked
   `confirmed_fraud`.
4. Additional manual signals to check before approving high-value clusters:
   - many referrals from one advocate in a short window,
   - referred accounts that cancel immediately after qualifying,
   - chargebacks or unpaid balances on either side.

## Cap, expiration, tax (owner/professional)

- **Monthly cap:** none (owner-confirmed 2026-07-23). The approval path already
  honors "no cap" (uncapped) and will enforce a ceiling automatically if a cap is
  ever set in config.
- **Expiration:** `[OWNER: recommended 12 months after earned; set in policy +
  add an expiry job.]`
- **Tax/accounting:** `[ACCOUNTANT: confirm treatment and any reporting.]`

## Payout mechanics

Credits reduce future CurbSitter charges only; they are not cash and not
transferable. Applying earned credit to an invoice moves it to `applied`.
`[ENGINEERING: an "apply earned credit at next invoice" step and an expiry job are
follow-on features once expiration is set.]`
