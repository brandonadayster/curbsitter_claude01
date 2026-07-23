# ADR 0001 — Baseline implementation decisions (v1.1 kit adoption)

**Date:** 2026-07-19
**Status:** Accepted — owner approved 2026-07-23

## Context

The v1.1 AI Agent Project Kit was adopted into the pre-existing CurbSitter
repository rather than a brand-new one. The repo contained a prototype that
predated the kit and contradicted several locked decisions (zip-only
eligibility, retired plan tiers, fabricated UI activity, referral credit at
checkout). The following implementation-level decisions were made while
reconciling; none change pricing, scope, or public claims.

## Decisions

1. **Package manager: npm, not pnpm.** The repository already had a committed
   `package-lock.json` and working `node_modules`. Switching to pnpm mid-stream
   adds churn without product benefit. TECH_STACK.md's pnpm recommendation can
   be revisited before Phase 7.
2. **Framework pinned at bootstrap versions already in the lockfile:**
   Next 16.2.10, React 19.2.4, Node 24 (`.nvmrc`), Tailwind 4 (CSS-first
   tokens), TypeScript strict.
3. **Migration history reset pre-production.** The legacy prototype schema
   (waitlist/zip/tier tables) was archived to `docs/archive/legacy-migrations/`
   and replaced with a DATA_MODEL.md-aligned baseline. This is safe only
   because no production deployment exists; after first production deploy,
   migrations are append-only.
4. **Local Supabase stack for all agent development.** `.env.local` previously
   pointed at a hosted Supabase project; those credentials were moved to
   `.env.local.remote-backup` (gitignored). Per SECURITY_PRIVACY.md, agents use
   local/dev/test credentials only.
5. **Explicit Postgres grants.** The current supabase/postgres image grants no
   DML to `anon`/`authenticated`/`service_role` by default. The RLS migration
   grants verbs explicitly per table; tables absent from the grant list are
   server-only by construction.
6. **Access-secret encryption:** AES-256-GCM at the application layer with
   `ACCESS_SECRETS_KEY` (32-byte base64). Key rotation strategy is owner work
   before launch (SECURITY_PRIVACY.md).
7. **Legacy prototype code removed from the working tree** (root `app/`,
   `src/` prototype pages, `.archive_frontend/`, `.antigravity/`). Everything
   remains recoverable from git history; the deep-onyx visual direction was
   carried forward through the new token system.
8. **Referral credits are not issued at checkout.** The prototype webhook
   issued a $20 Stripe balance credit on `checkout.session.completed`; the
   rebuilt flow records attribution only, with credit accrual deferred to the
   qualifying completed paid cycle (D-014).

## Consequences

- `README.md`/`TECH_STACK.md` references to pnpm remain aspirational until the
  owner rules on decision 1.
- A future staging/production environment needs its own Supabase project,
  Stripe test/live keys, and secrets provisioning (owner-gated).
