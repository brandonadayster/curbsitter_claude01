# Pause & Cancellation Cutoff Policy — DRAFT

> Resolves OPEN_DECISIONS #12. Must be consistent with the Terms (§8) and with how
> the system generates cycles/tasks. Config touchpoint: cycle generation only
> services active, non-cancelling subscriptions (already implemented and tested);
> a **cutoff window** still needs to be encoded.

## The problem to define

Cycles and tasks are generated ahead of the collection date. Once a task is
generated (and especially once a runner is en route), a late pause/cancel
shouldn't strand operations or unfairly bill the customer. We need one clear,
fair cutoff.

## Recommended policy (draft)

- **Cutoff:** a pause or cancellation must be made **at least `[24]` hours before
  the next scheduled rollout window** to affect that cycle.
- **Before cutoff:** the upcoming cycle is not serviced or billed (for one-time)
  / is skipped without affecting the plan (for subscriptions per plan terms).
- **After cutoff:** the already-generated cycle proceeds as scheduled; the change
  applies to the following cycle and future renewals.
- **Quarterly prepay:** cancellation stops future renewal; the current prepaid
  quarter runs to its end unless a serviceability decline triggers a refund
  (no proration mid-quarter unless required by law — confirm in Terms §8).
- **Pause:** suspends future cycle generation; resume re-enables it under the same
  cutoff.

## System changes to implement

The current `changeSubscription` action toggles state immediately, and cycle
generation already skips paused/cancelling subscriptions. To honor the cutoff:
1. When generating cycles, only include subscriptions active at generation time
   (already true).
2. When a pause/cancel happens **after** a cycle for the next date already exists
   and is **inside the cutoff window**, keep that cycle (do not delete it) and
   apply the change from the following date. `[ENGINEERING: add a cutoff check
   that cancels the upcoming cycle only if now < window_start − cutoff.]`
3. Surface the cutoff clearly in the billing UI ("Changes made within 24 hours of
   your next rollout apply to the following visit").

## Owner to confirm

- The cutoff duration (recommend 24 hours; align with the disclaimer in the
  prototype and the Terms).
- Whether any mid-quarter proration is offered on cancellation.
