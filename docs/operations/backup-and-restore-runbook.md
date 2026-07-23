# Backup & Restore Runbook — DRAFT

> Resolves part of P7-03. Assumes Supabase-managed Postgres + Storage on a paid
> plan (PITR requires Pro or higher). Confirm plan and settings in the Supabase
> dashboard.

## Targets (draft — owner to set)

- **RPO (max data loss):** `[≤ 5 minutes]` (with PITR enabled).
- **RTO (max downtime to restore):** `[≤ 4 hours]`.

## What must be protected

1. **Postgres database** — accounts, properties, subscriptions, cycles/tasks,
   photos metadata, consents, audit log, etc.
2. **Storage buckets** — `proof-photos`, `property-reference` (private).
3. **Secrets/config** — env vars (`.env` values held in the deploy platform and a
   secure vault), `ACCESS_SECRETS_KEY` (critical: without it, access secrets are
   unrecoverable), Stripe keys, `CRON_SECRET`.
4. **Code + migrations** — in Git (GitHub); the source of truth for schema.

## Backup configuration

- **Database:**
  - Enable **Point-in-Time Recovery (PITR)** in Supabase (Pro+). Verify retention
    window `[7 days]`.
  - Confirm Supabase's daily automated backups are on.
  - `[Optional] Nightly `pg_dump` to an independent, encrypted off-provider store
    (e.g., a separate cloud bucket) for provider-independent recovery. Never
    include it in the repo.`
- **Storage:** enable/verify storage backups per Supabase's current capabilities;
  if none, run a periodic server-side copy of the private buckets to an encrypted
  off-provider bucket. Object paths are recorded in `service_photos`.
- **Secrets:** store a sealed copy of `ACCESS_SECRETS_KEY` and other secrets in a
  password manager / secrets vault with restricted access. **Rotating or losing
  `ACCESS_SECRETS_KEY` makes existing encrypted access instructions unreadable.**

## Restore procedures

### A. Database point-in-time restore
1. Identify the target timestamp (just before the incident).
2. In Supabase, initiate PITR to the target time (this may create a new project or
   restore in place — follow current Supabase guidance).
3. Re-point `NEXT_PUBLIC_SUPABASE_URL` / keys if the project changed.
4. Run `supabase db diff`/migration check to confirm schema matches `main`.
5. Verify row counts and a few known records; run the RLS smoke test.

### B. Storage restore
1. Restore objects from the storage backup/off-provider copy.
2. Reconcile against `service_photos.object_path`; re-mint no URLs (signed URLs
   are generated on demand).

### C. Full-provider-loss (worst case)
1. New Supabase project; apply `supabase/migrations` + seed structure.
2. Restore DB from the independent `pg_dump`; restore storage from the off-
   provider copy.
3. Restore secrets from the vault (including `ACCESS_SECRETS_KEY`).
4. Redeploy the app pointing at the new project.

## Verification & drills

- **Quarterly restore drill:** restore to a scratch project, run the RLS smoke
  test + Playwright E2E against it, confirm signed photo access works, then tear
  it down. Record RTO/RPO actuals.
- Alert on backup failures.

## Owner to confirm

- Supabase plan/PITR window, whether to add an off-provider backup, RTO/RPO
  targets, and who holds the secrets vault.
