# Deployment Runbook

## Environments

- Local: synthetic data only.
- Preview: per pull request, isolated safe configuration.
- Staging: production-like integrations in test mode.
- Production: owner-approved secrets, content, areas, prices, and policies.

## Before first production deployment

- Confirm `BUSINESS_CONFIG.md` publication locks.
- Legal review of terms/privacy/SMS/add-on scope.
- Insurance and worker safety confirmation.
- Stripe live products/prices and Customer Portal configuration.
- Private storage policies and retention jobs.
- RLS test suite passes.
- Domain, DNS, email authentication, sender reputation.
- Sentry filtering and analytics privacy review.
- Backups and restore test.
- Production service cells and capacity.
- Real contact information; no fake reviews/counters.

## Release procedure

1. Merge passing reviewed change.
2. Apply migrations in staging and run smoke tests.
3. Back up production and review migration plan.
4. Deploy application with feature flags off for incomplete features.
5. Apply migration through approved pipeline.
6. Run production smoke tests with a designated test account/property.
7. Observe errors, webhooks, notification queues, and task generation.
8. Enable feature flags gradually.

## Rollback

- Application rollback to previous Vercel deployment.
- Prefer backward-compatible expand/contract migrations.
- Do not destructively roll back data without a tested restore plan.
- Pause task generation/notifications independently through feature flags.

## Scheduled operations

- Daily failed webhook/outbox/exception review.
- Daily route/task generation verification during active days.
- Weekly billing/reconciliation and storage failure review.
- Monthly restore sample, access review, and retention job check.
