# Security Review — P7-01

**Date:** 2026-07-23
**Reviewer:** Claude (agent), against `SECURITY_PRIVACY.md`, `AGENTS.md`, and `.claude/rules/security.md`
**Scope:** auth/authorization, RLS + service-role usage, Stripe webhook, private photo
access, access-secret handling, input validation, PII/secret logging, transport/headers,
rate limiting, and business-rule drift.

## Verified sound (no change required)

- **RLS + authorization model.** Default-deny RLS with explicit per-verb grants; sensitive
  tables (`property_access_secrets`, `webhook_events`, `incidents`, acquisition, outbox,
  audit) expose no client policies and are server-role only. Cross-account/runner isolation
  is proven by `scripts/test_rls.sh` and the E2E own-vs-foreign signed-photo test (200 vs 404).
- **Service-role (RLS-bypassing) call sites.** Every `createSupabaseAdminClient()` use in a
  customer/runner surface is gated behind an RLS-authorized read or an explicit
  session + membership/assignment check before the privileged call (spot-audited:
  customer referrals/properties/notifications pages, all customer actions, runner routes).
- **Admin surface.** `admin/layout.tsx` enforces `requireStaff()`; every admin server action
  calls `assertRole([...])` independently (UI hiding is never the control).
- **Stripe webhook.** Signature-verified; idempotent via `webhook_events` unique
  `(provider, event_id)`; concurrent-duplicate safe; only previously-failed events reprocess;
  finalize is itself idempotent. No payloads or PII logged.
- **Access secrets.** AES-256-GCM at rest in an isolated table; reveal is restricted to the
  **assigned runner** and **only during the active service window**, is audited (task id only,
  never the secret), and the secret never enters logs, notifications, or list queries.
  Portal edits are write-only (no read-back).
- **Private photos.** Private buckets, no object policies; access is short-lived signed URLs
  minted only after an RLS-checked authorization.
- **Input validation.** All external inputs validated with zod at the boundary.
- **Logging.** No addresses+access codes, tokens, or payloads written to logs (grep-audited).

## Findings fixed in this pass

| # | Finding | Severity | Fix |
|---|---------|----------|-----|
| 1 | No security headers / CSP (`SECURITY_PRIVACY.md` requires CSP + secure headers). | Medium | Added `headers()` in `next.config.ts`: CSP (browser calls scoped to Supabase only), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, and HSTS in production. |
| 2 | No auth-session refresh middleware (tokens expired without refresh). | Low–Medium | Added `src/middleware.ts` (@supabase/ssr `getUser()` refresh). Route authorization stays in server components/layouts. |
| 3 | No rate limiting on public write endpoints (eligibility calls Mapbox and writes rows; waitlist/contact/draft writable). | Medium | Added `src/lib/rate-limit.ts` baseline limiter, applied per-IP to `/api/eligibility/check`, `/api/waitlist`, `/api/contact`, `/api/onboarding/draft` (429 + `Retry-After`). Verified it fires. |

All fixes verified: 36 unit/integration tests green, full 24-test Playwright suite green with the
controls active (middleware + CSP do not break auth/customer/runner/admin flows; the Supabase
browser client is allowed by `connect-src`), and the limiter returns 429 under burst.

## Remaining before launch (owner / infra — not code the agent should ship blind)

- **Distributed rate limiting + bot protection.** The in-memory limiter is per-instance and
  best-effort; on serverless/multi-instance it only blunts casual abuse. Back it with Upstash
  Redis / Vercel KV, and add Cloudflare Turnstile (or equivalent) on the public forms.
- **CSP hardening.** `script-src` still allows `'unsafe-inline'` because Next injects inline
  bootstrap scripts without a nonce. Move to a nonce-based CSP for stricter XSS defense.
- **Secret rotation plan.** `ACCESS_SECRETS_KEY`, Supabase service-role key, and Stripe keys
  need a documented rotation procedure (and the access-secret key rotation implies a
  re-encryption path).
- **Step-up verification for customer access-secret *reveal*.** Portal access secrets are
  currently write-only; if a read-back is ever added, gate it behind step-up auth.
- **Dependency and infra review.** `npm audit` in CI, Supabase Row-Level-Security advisor,
  and a third-party penetration test before public launch.
- **Abuse monitoring.** Sentry alerting on 429 spikes, webhook failures, and repeated
  authorization denials.
