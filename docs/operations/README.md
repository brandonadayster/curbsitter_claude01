# CurbSitter Operational Drafts — For Owner Review

> **DRAFTS.** Prepared by an AI assistant as best-practice starting points. Items
> touching employment, insurance, tax, or safety law require review by the
> appropriate licensed professional (attorney, insurance broker, accountant).
> Resolve every `[BRACKETED]` value.

These cover the operational items still open in `OPEN_DECISIONS.md` and the
non-legal parts of Phase 7 in `TODO.md`. Each is written to be consistent with
`PROJECT_TRUTH.md`, `OPERATIONS_PLAYBOOK.md`, and the locked service model.

## Documents

| File | Open item | Purpose |
|---|---|---|
| `route-cell-activation-runbook.md` | OD #3 | Criteria + steps to open a route cell live |
| `complexity-and-access-adjustment-policy.md` | OD #4 | Thresholds and adjustments for hard-access properties |
| `bulk-pickup-coordination-sop.md` | OD #5 | Provider-authorization + physical-placement limits |
| `referral-operational-policy.md` | OD #6 | Fraud-review workflow + expiration/tax placeholders |
| `data-retention-schedule.md` | OD #7 | Authoritative retention table + deletion mechanics |
| `worker-and-field-standards.md` | OD #8 | Employment/contractor model, checks, driving, insurance |
| `customer-service-sla.md` | OD #9 | Hours, channels, and response targets |
| `hoa-community-pilot.md` | OD #11 | Pilot pricing and reporting format |
| `pause-and-cancellation-policy.md` | OD #12 | Exact cutoff for already-generated tasks |
| `founder-offer-policy.md` | OD #2 | Optional launch-offer template (owner decides) |
| `insurance-and-legal-checklist.md` | P7-05 | Coverage + legal readiness tracker |
| `backup-and-restore-runbook.md` | P7-03 | Database/storage backup, restore, RTO/RPO |
| `incident-response-plan.md` | P7-03 | Runnable incident + breach drill |
| `production-content-readiness-checklist.md` | P7-04 | Replace placeholders with verified content |
| `shadow-route-and-staff-training-plan.md` | P7-06 | Train + shadow before live routes |
| `soft-launch-and-pilot-metrics-plan.md` | P7-07 | Controlled launch + metrics to watch |

## How the pieces connect to the app

Several of these map directly to typed configuration already in the codebase
(`src/config/business.ts`, `BUSINESS_CONFIG.md`). When a policy value is decided,
it should be set there, not hardcoded in pages (Decision D-017). Each doc notes
its config touchpoint.
