import { getPlanPriceCents, ONE_TIME, PLANS, type BillingInterval, type PlanId } from "@/config/business";
import type { Stage3 } from "@/lib/onboarding-schemas";

/**
 * Server-side quote calculation. The client never supplies totals
 * (API_CONTRACT.md), and complexity never creates silent surcharges
 * (no-surprise policy, PROJECT_TRUTH.md pricing guardrail).
 *
 * D-026 retired the access-review flag this used to compute: a desk review
 * could never verify a gate code before a runner was on site. Access detail
 * quality is enforced by schema validation at onboarding instead, and
 * anything found at the property is handled by the runner and the existing
 * exception tooling.
 */

export interface Quote {
  serviceChoice: "home" | "complete" | "one_time_trash_day";
  billingInterval: BillingInterval | null;
  description: string;
  amountDueCents: number;
  recurrence: "monthly" | "quarterly" | "one_time";
  binLimitOk: boolean;
}

export function buildQuote(stage3: Stage3): Quote {
  const totalBins = stage3.trashBinCount + stage3.recyclingBinCount;

  if (stage3.serviceChoice === "one_time_trash_day") {
    return {
      serviceChoice: "one_time_trash_day",
      billingInterval: null,
      description: ONE_TIME.trashDayPublicName,
      amountDueCents: ONE_TIME.trashDayPriceCents,
      recurrence: "one_time",
      binLimitOk: totalBins <= ONE_TIME.trashDayIncludedBins,
    };
  }

  const planId: PlanId = stage3.serviceChoice;
  const plan = PLANS[planId];
  const interval = stage3.billingInterval;

  return {
    serviceChoice: planId,
    billingInterval: interval,
    description:
      interval === "monthly"
        ? `${plan.publicName} — monthly`
        : `${plan.publicName} — quarterly, prepaid (billed every 3 months)`,
    amountDueCents: getPlanPriceCents(planId, interval),
    recurrence: interval,
    binLimitOk: totalBins <= plan.maxBins,
  };
}
