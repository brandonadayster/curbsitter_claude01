# Incident Response Plan & Drill — DRAFT

> Resolves part of P7-03. Expands the incident-response minimum in
> `SECURITY_PRIVACY.md` into a runnable plan. Covers **security/data incidents**
> and **field safety incidents** (which the runner app already reports).

## Roles (draft — owner to assign)

- **Incident Lead:** `[owner]` — coordinates response and decisions.
- **Technical Lead:** `[owner/contractor]` — contains and remediates systems.
- **Comms:** `[owner]` — customer/partner/legal notifications.
- **Advisors:** counsel and insurer/broker (engaged as needed).

## Severity levels

| Level | Examples | Response |
|---|---|---|
| SEV-1 | Confirmed data breach; access-secret exposure; payment compromise; runner injury/serious property damage | Immediate; engage counsel/insurer |
| SEV-2 | Suspected unauthorized access; prolonged outage; repeated webhook/billing failures | Same-day |
| SEV-3 | Minor bug with limited exposure; single non-safety field exception unresolved | Next business day |

## Security / data-incident procedure

1. **Contain** — revoke compromised credentials/keys; disable affected access;
   isolate systems. Rotate Supabase service-role key, Stripe keys, and
   `ACCESS_SECRETS_KEY` **only per the rotation plan** (key rotation for access
   secrets requires re-encryption).
2. **Preserve** — capture logs, audit_log, Sentry events, and webhook_events
   before changes.
3. **Assess** — what data/systems are affected; was sensitive data (access
   secrets, photos, PII, payment) exposed; how many customers.
4. **Notify** — owner + counsel + insurer immediately for SEV-1/2. Meet
   **Arizona breach-notification duties (A.R.S. § 44-7501)** and any card-network
   or contractual duties on counsel's advice. Notify affected customers as
   required.
5. **Remediate** — fix root cause; rotate credentials; restore from backup if
   needed (see Backup Runbook); add a regression test.
6. **Postmortem** — timeline, impact, root cause, and prevention items; track to
   completion.

## Field safety-incident procedure

- Runner files an incident in-app (built) with severity + description. For active
  danger: **call 911 first**, then dispatch.
- Dispatch reviews immediately; for high/critical: contact the customer as
  appropriate, flag the property (e.g., unsafe animal) until resolved, and notify
  insurer for injury/property-damage claims.
- Log outcome and any property flags; feed recurring hazards into property notes.

## Contacts (fill in)

- Counsel: `[name/phone]` · Insurer/broker: `[name/phone]` · Supabase support:
  `[plan support channel]` · Stripe support: `[dashboard]`.

## Drill (run before launch, then `[semi-annually]`)

1. **Tabletop:** walk a simulated SEV-1 access-secret exposure end to end; confirm
   everyone knows their role and the notification path.
2. **Technical:** rotate a test key in staging; confirm the app recovers; run the
   restore drill (Backup Runbook).
3. Record gaps and fix them.

## Owner to confirm

- Role assignments, contacts, drill cadence, and counsel's notification guidance.
