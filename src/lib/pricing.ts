import { getPlanPriceCents, ONE_TIME, PLANS, type BillingInterval, type PlanId } from "@/config/business";
import type { Stage3 } from "@/lib/onboarding-schemas";

/**
 * Server-side quote calculation. The client never supplies totals
 * (API_CONTRACT.md), and complexity never creates silent surcharges — it can
 * only flag the property for review before activation (no-surprise policy,
 * PROJECT_TRUTH.md pricing guardrail).
 */

/** Hazards that trigger an access review instead of an automatic price change. */
const REVIEW_HAZARDS = new Set(["steep_grade", "long_driveway", "gate", "garage", "access_restriction"]);

export interface Quote {
  serviceChoice: "home" | "complete" | "one_time_trash_day";
  billingInterval: BillingInterval | null;
  description: string;
  amountDueCents: number;
  recurrence: "monthly" | "quarterly" | "one_time";
  requiresAccessReview: boolean;
  binLimitOk: boolean;
}

export function buildQuote(stage3: Stage3): Quote {
  const requiresAccessReview = stage3.hazards.some((hazard) => REVIEW_HAZARDS.has(hazard));
  const totalBins = stage3.trashBinCount + stage3.recyclingBinCount;

  if (stage3.serviceChoice === "one_time_trash_day") {
    return {
      serviceChoice: "one_time_trash_day",
      billingInterval: null,
      description: ONE_TIME.trashDayPublicName,
      amountDueCents: ONE_TIME.trashDayPriceCents,
      recurrence: "one_time",
      requiresAccessReview,
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
    requiresAccessReview,
    binLimitOk: totalBins <= plan.maxBins,
  };
}
