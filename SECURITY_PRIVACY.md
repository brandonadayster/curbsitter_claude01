# Security, Privacy, and Compliance Guardrails

This is an engineering baseline, not legal advice. Production policies and contracts require qualified legal and insurance review.

## Sensitive data

- Addresses and exact coordinates.
- Gate, garage, lockbox, key, alarm, and access details.
- Property photos and travel/away status.
- Phone/email and communication consent.
- Payment and billing metadata.
- Worker location and incident data.

## Controls

- Private object storage only.
- Short-lived signed URLs after authorization.
- RLS and server-side authorization.
- Separate access-secret table and restricted service.
- Step-up authentication before customers/admins reveal sensitive access data.
- Least-privilege runner access limited to assigned task and service window.
- Audit privileged reads/changes.
- Redact sensitive values from logs, Sentry, analytics, support exports, and notifications.
- Encrypt secrets in transit and at rest; use application-level encryption for high-risk fields if the platform threat model requires it.
- Rotate keys and provider credentials.
- Rate limit public forms, auth, access reveals, signed URL creation, and webhook endpoints.

## Photo rules

- Capture only what proves service or documents an agreed checklist/exception.
- Avoid doors/windows/interiors/people/license plates when not needed.
- No facial recognition.
- No public gallery.
- Retention default in `BUSINESS_CONFIG.md`; customers see the policy and may request deletion subject to legal/operational needs.

## Communications

- Record the exact consent language version, channel, purpose, timestamp, and source.
- Transactional and marketing consent are separate.
- Honor STOP/opt-out and reasonable revocation paths.
- Email includes lawful identification and unsubscribe controls where required.
- Do not put gate codes or sensitive access instructions in SMS/email.

## Payments

- Stripe-hosted/tokenized collection.
- Verify webhook signatures.
- Idempotency keys for create/update/credit operations.
- Do not log payment method details.

## Agent and developer safety

- Agents may use local/dev/test credentials only.
- Production secrets, deployments, billing changes, migrations, and destructive commands require explicit human approval.
- Never paste customer data into model prompts or issue trackers.
- Use synthetic fixtures.

## Incident response minimum

1. Contain access.
2. Preserve logs/evidence.
3. Assess affected data and systems.
4. Notify owner and qualified counsel/insurer.
5. Meet applicable notification duties.
6. Rotate credentials and remediate.
7. Document postmortem and prevention work.
