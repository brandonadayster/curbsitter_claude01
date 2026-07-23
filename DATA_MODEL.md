# Data Model

## Identity and tenancy

- `profiles`: auth user profile and role.
- `accounts`: billing/ownership entity; individual, household, HOA, or portfolio.
- `account_members`: membership, role, and notification permissions.
- `contacts`: payer, service recipient, caregiver, property manager, HOA contact.

## Properties and access

- `properties`: normalized service address, coordinates, route cell, status, timezone.
- `property_contacts`: contact roles per property.
- `bins`: bin type, size, color/identifier, active status.
- `collection_schedules`: provider, waste stream, weekday, frequency, verification status, effective dates.
- `property_instructions`: ordinary runner instructions and reference media.
- `property_access_secrets`: encrypted/segregated gate, garage, lockbox, and key instructions; never selected in broad list queries.
- `property_hazards`: animals, grade, lighting, stairs, ice, access restrictions.

## Catalog and billing

- `plans`: public names, limits, current price references.
- `services`: one-time/add-on catalog.
- `subscriptions`: account/property plan state and Stripe IDs.
- `orders`: one-time service orders.
- `order_items`: service, quantity, approved price, scope.
- `credits`: referral/manual credit ledger.
- `webhook_events`: provider event ID, payload hash, processing status.

## Territory and operations

- `service_areas`: market/city hierarchy.
- `route_cells`: polygon/geo definition, collection-day context, activation state, capacity, thresholds.
- `eligibility_checks`: submitted address, result, reason, route cell, consent-safe attribution.
- `waitlist_leads`: route interest and contact preferences.
- `routes`: operational route instance, task type, date, worker, status.
- `collection_cycles`: property + schedule + collection date + lifecycle state.
- `service_tasks`: rollout/return/recheck/home-watch/bulk-setout task, route, sequence, window, status.
- `task_events`: immutable state-transition/event log.
- `service_photos`: task, type, object path, metadata, retention, uploader.
- `exceptions`: category, severity, task, owner, customer visibility, resolution.
- `incidents`: safety/property damage report with restricted access.

## Communications and growth

- `consents`: channel, purpose, language version, timestamp, source.
- `notification_templates`: channel/version.
- `notification_outbox`: event, recipient, status, attempts, provider ID.
- `support_tickets`: customer/admin support flow.
- `referral_codes`: advocate and route cell.
- `referrals`: advocate, referred lead/account, qualifying status, fraud status.
- `audit_log`: privileged actions and before/after metadata without secrets.

## Required enums

- account role: owner, manager, caregiver, viewer.
- platform role: customer, runner, dispatcher, admin, support.
- route-cell state: research, waitlist, opening, active, capacity_full, premium_review, closed.
- cycle state: planned, rollout_scheduled, rolled_out, collection_pending, return_scheduled, completed, completed_with_exception, delayed_by_hauler, blocked, cancelled.
- task type: rollout, return, recheck, home_watch, bulk_setout.
- task status: draft, scheduled, assigned, en_route, arrived, completed, exception, retry_required, cancelled.
- exception type: access_blocked, bin_missing, bin_blocked, hauler_missed, partial_collection, unsafe_condition, weather, animal, overweight_or_contaminated, damage, schedule_mismatch, other.

## Important constraints

- A task belongs to exactly one property and collection cycle/order.
- Normal rollout/return completion requires a photo record or an authorized photo-waiver exception.
- State changes append to `task_events`; do not overwrite history.
- Stripe event IDs and referral qualifying events are unique.
- Access secrets are never returned through customer lists, admin dashboards, analytics exports, or runner route payloads until the specific task is opened.
- Soft delete operational records only when required; use retention jobs for photos and secrets.

## RLS intent

- Customers see accounts/properties they belong to.
- Caregivers see only explicitly assigned properties and permissions.
- Runners see only assigned routes/tasks and the minimum data required during the service window.
- Support may view ordinary account information but not access secrets by default.
- Admin access is logged and still scoped through server-side authorization.
