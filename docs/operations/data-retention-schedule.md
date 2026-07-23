# Data Retention Schedule — DRAFT

> Resolves OPEN_DECISIONS #7. Authoritative source for retention values that the
> Privacy Policy references. Config touchpoints: `STORAGE_POLICY` in
> `src/config/business.ts` (`defaultPhotoRetentionDays`, `signedUrlTtlSeconds`,
> `accessDataRetention`) and the `service_photos.retention_expires_at` column.

## Retention table (draft — confirm with counsel/accountant)

| Data category | Default retention | Basis | Deletion mechanism |
|---|---|---|---|
| Proof photos (private bucket) | **180 days** after capture | Proof/dispute window; minimize sensitive imagery | Retention job deletes storage object + `service_photos` row past `retention_expires_at` |
| Property access secrets | **Active account + 90 days** after closure | Operational need only while serving | Retention job purges `property_access_secrets` for closed accounts past window |
| Reference photos (property) | `[180]` days or until property inactive | Same as proof | Retention job |
| Service/exception/task records | `[7 years]` | Business, tax, dispute, safety records | Archive then purge |
| Consent records | Relationship + `[statutory period]` | Prove consent (TCPA/E-SIGN) | Retain; do not delete early |
| Payment metadata | Per Stripe + `[record-keeping period]` | Financial records | Processor + minimal local metadata |
| Audit log (privileged actions) | `[2 years]` | Security/accountability | Archive then purge |
| Eligibility checks / waitlist | `[24 months]` or until converted/unsubscribed | Marketing + route planning | Purge job |
| Support tickets | `[24 months]` after close | Support history | Purge job |

## Deletion mechanics to implement

The values above are stored, but the **retention/purge jobs are not yet built**.
Recommended:
- A scheduled job (Supabase cron / a `/api/jobs/retention` route guarded by
  `CRON_SECRET`, mirroring the outbox worker) that:
  1. deletes storage objects + `service_photos` rows past `retention_expires_at`;
  2. purges `property_access_secrets` for accounts closed > `[90]` days;
  3. purges eligibility/waitlist/support rows past their windows.
- Log counts (not contents) of what was purged.

## Customer deletion requests

On request (Privacy Policy §8), delete personal data subject to records we must
retain (financial/tax/dispute). Verify identity first. Document the request and
what was retained and why.

## Owner/professional to confirm

- The bracketed retention periods (especially the multi-year records windows).
- Whether any Arizona/industry rule requires a specific minimum.
