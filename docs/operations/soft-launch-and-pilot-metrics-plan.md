# Soft-Launch & Pilot Metrics Plan — DRAFT

> Resolves P7-07. A controlled first opening with daily review and clear
> go/no-go metrics. Ties to the KPI dashboard already built (`/admin/reports`).

## Soft-launch shape

1. Open **one** route cell (see Route-Cell Activation Runbook) with a capped
   number of homes `[e.g., 10–20]`.
2. Contact the waitlist for that cell first; onboard in small batches.
3. Run daily for the first `[2–3]` weeks with a same-day review of every cycle.
4. Only add adjacent density / a second cell once reliability holds without
   founder heroics.

## Daily review (first weeks)

Each service day, confirm:
- Every generated cycle has both proof outcomes **or** a documented exception.
- Every exception has an owner, a customer message, and a closure path.
- No missed rollouts/returns went unrecorded.
- Photo uploads succeeded (watch retry/failure).
- Support contacts triaged within the SLA.

## Metrics to watch (go/no-go)

**Reliability (primary):**
- Cycle completion / proof rate — target **≥ 95%** both-proof-or-exception.
- Preventable missed-service rate — target **< 2%** after stabilization.
- On-time return within the published window.
- Photo upload failure/retry rate.

**Route economics:**
- Revenue and contribution per route hour/mile; actual task time by complexity.
- Capacity utilization vs. the cell's set capacity.

**Growth/health:**
- Address-check → eligibility → onboarding → checkout conversion.
- Referral share and qualification.
- Churn / pause behavior; support contacts per 100 cycles.

## Go / no-go gates before expanding

- [ ] Reliability targets met for `[2]` consecutive weeks.
- [ ] Route contribution ≥ target at current density.
- [ ] No unresolved SEV-1/2 incidents; backup/restore drill passed.
- [ ] Runner completes stops without coaching; times match assumptions.
- [ ] Legal/insurance items closed (see checklist).

## Rollback plan

If reliability or safety degrades: pause new signups for the cell (set
`capacity_full` or `opening`), notify affected customers honestly, resolve root
cause, and re-open only after the gates are met again. Never fake completions to
protect a metric.

## Owner to confirm

- The first cell, home cap, review cadence, and the person accountable for the
  daily review.
