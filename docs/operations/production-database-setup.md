# Production Database Setup & Reset Runbook — DRAFT

> Applies the rebuilt schema to the hosted Supabase project and seeds it with
> **reference data only** (no dev users). This is a **destructive reset** — it
> drops the old prototype schema/data on the hosted project. Only run it when you
> have confirmed there is no data on the hosted project you need to keep.

**Target project:** `uvnrgimteckqcvpcdcae` ("CurbSitter", us-west-2, Postgres 17).

## Before you start

- [ ] Confirm the hosted project holds **no data worth keeping** (owner decision:
      reset was chosen).
- [ ] Take a safety backup anyway (Dashboard → Database → Backups, or a
      `pg_dump`) in case of a mistake.
- [ ] Have the project's **database password** (Dashboard → Project Settings →
      Database) and a **Supabase access token** (`supabase login`) if using the
      CLI path.

## What gets applied

1. **Migrations** (`supabase/migrations/`): core schema + enums, RLS + grants +
   private storage buckets, onboarding drafts, and the referral-credit FK.
2. **Production seed** (`supabase/seed/production.sql`): plans, services,
   Prescott service area, three route cells in `research`, and notification
   templates. **No dev users, no test data.**

> The local seed `supabase/seed/seed.sql` must **never** be applied here — it
> creates known-password dev accounts. Config pins local reset to that file;
> production uses `production.sql`.

---

## Path A — Supabase CLI (recommended, reproducible)

```bash
# 1. Authenticate and link to the hosted project
supabase login                         # opens browser; creates access token
supabase link --project-ref uvnrgimteckqcvpcdcae

# 2. Reset the REMOTE database and re-apply all migrations.
#    This DROPS existing objects on the hosted project.
supabase db reset --linked

# 3. Apply the PRODUCTION seed (reference data only).
#    db reset --linked runs supabase/seed/seed.sql per config — which we DO NOT
#    want on prod. Two safe options:
#    (a) temporarily point [db.seed].sql_paths at ./seed/production.sql, run the
#        reset, then revert; OR
#    (b) run reset with seeding disabled, then apply production.sql by hand:
psql "$(supabase db url --linked)" -f supabase/seed/production.sql
```

> IMPORTANT: because `supabase db reset --linked` honors `[db.seed].sql_paths`
> (currently the dev seed), either disable seeding for the reset or switch the
> path to `production.sql` for the run. Do not let the dev seed run against prod.

## Path B — Supabase MCP (agent-assisted, no DB password needed)

If you approve the Supabase MCP tools for this session, the agent can:
1. `list_tables` (confirm current state),
2. `execute_sql` → `drop schema public cascade; create schema public;` plus the
   re-grants Supabase expects (and reset `storage`/`auth` as needed — **confirm
   scope carefully**),
3. `apply_migration` for each file in `supabase/migrations/` in order,
4. `execute_sql` with the contents of `supabase/seed/production.sql`,
5. `list_tables` + a quick RLS check to verify.

The agent's MCP calls to a production project are gated by a safety classifier;
you must explicitly allow them.

## Path C — Supabase Dashboard

Use the SQL editor to run the migration files in order, then `production.sql`.
Slower and error-prone; prefer A or B.

---

## After applying

1. **Verify:** table count matches local (`\dt`), RLS enabled on all public
   tables, private buckets `proof-photos` and `property-reference` exist and are
   **not** public, plans/services/templates present.
2. **Env wiring (NOT local `.env.local`):** set in your deploy platform (Vercel)
   or `.env.production.local`:
   - `NEXT_PUBLIC_SUPABASE_URL=https://uvnrgimteckqcvpcdcae.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key: sb_publishable_...>`
   - `SUPABASE_SERVICE_ROLE_KEY=<secret key: sb_secret_...>` (server-only)
   - Plus `ACCESS_SECRETS_KEY`, `CRON_SECRET`, Stripe live keys, email provider.
   Keep local development pointed at the local stack.
3. **Smoke test** against the hosted project from a preview deploy: address check,
   waitlist join, sign-in, and (if a runner/admin exists) an admin page.
4. **Create real staff accounts** through Supabase Auth (Dashboard → Authentication
   → Users) and set their `profiles.platform_role`; do **not** recreate the dev
   users.

## Rollback

If something goes wrong mid-apply, restore from the pre-reset backup and
re-attempt after fixing the issue.

---

## Reset completed 2026-07-24 (record)

The hosted project `uvnrgimteckqcvpcdcae` was reset and rebuilt via the MCP path:
old prototype schema (waitlist/users/county_subdivisions/PostGIS) dropped; 5
migrations applied; `production.sql` seeded (2 plans, 4 services, 3 research
route cells, 10 templates). Verified: 37 tables, **RLS on every public table**,
**zero public buckets**, **zero storage.objects policies**, no active route
cells, migration history aligned to local filenames.

Security cleanup performed during the reset:
- Removed the old **public** `proof_of_work_photos` bucket's public flag and its
  five permissive "anonymous/public read+upload" policies (they would have
  exposed the new private buckets).
- Added `20260724120000_harden_function_grants` to fix the advisor's real
  finding: `get_user_id_by_email` was callable by `anon` via `/rest/v1/rpc`
  (email enumeration) — now `PUBLIC` execute revoked, `service_role` retained.

### Remaining advisor items (accepted / owner)

- **INFO — RLS enabled, no policy** on `audit_log`, `eligibility_checks`,
  `notification_outbox`, `notification_templates`, `onboarding_drafts`,
  `property_access_secrets`, `waitlist_leads`, `webhook_events`: **by design** —
  these are server-only tables (default-deny; only the service role reaches
  them). No client policy is intended.
- **WARN — SECURITY DEFINER helpers callable by authenticated** (`is_account_member`,
  `is_account_manager`, `can_view_property`, `is_assigned_runner_for_task`,
  `is_staff`, `current_platform_role`): **accepted** — RLS policies must be able
  to execute them, and they only ever reveal the *caller's own* membership/role
  (`auth.uid()`), so REST exposure leaks nothing. Future hardening: move them to
  a private (non-API) schema.
- **WARN — Leaked Password Protection disabled** (Auth): **owner toggle** —
  enable in Dashboard → Authentication → Providers/Policies (HaveIBeenPwned
  check). Recommended for production; low urgency since sign-in is magic-link by
  default.

### Still to do (owner)

- Delete the orphaned old `proof_of_work_photos` bucket (14 test objects) from
  Dashboard → Storage (SQL can't delete storage objects).
- Wire the hosted keys into the **deploy platform** (see "After applying" above),
  not local `.env.local`.
- Create real staff accounts via Auth and set `profiles.platform_role`.
