/**
 * Typed business configuration — the single application source for pricing,
 * service limits, windows, and policy values.
 *
 * Mirrors BUSINESS_CONFIG.md (v1.1 baseline, owner pricing package 2026-07-13).
 * Do not scatter these values through page components (Decision D-017).
 * Values marked OWNER_CONFIRM in BUSINESS_CONFIG.md are `null` here and must be
 * resolved by the owner in DECISION_REGISTER.md before production launch.
 */

export type PlanId = "home" | "complete";
export type BillingInterval = "monthly" | "quarterly";

export interface PlanConfig {
  id: PlanId;
  publicName: string;
  monthlyPriceCents: number;
  quarterlyPriceCents: number;
  /**
   * Quarterly plans are prepaid and renew every three months (D-012). The
   * quarterly amount is displayed as a discounted per-month rate via the pricing
   * toggle (D-004 revision, 2026-07-27). Payable by card or ACH.
   */
  quarterlyPaymentMethod: "card_or_ach_prepaid";
  maxBins: number;
  collectionCoverage: "one_regular_day_per_week" | "all_regular_collection_days";
  includesTrashAndRecyclingWithinCoveredDays: true;
  summary: string;
}

export const BUSINESS = {
  name: "CurbSitter",
  legalName: "CurbSitter, LLC", // confirmed 2026-07-23
  market: "Prescott, Arizona",
  timezone: "America/Phoenix",
  primaryTagline: "Trash day, handled.",
  serviceLine: "Bins out. Bins back. Photo-confirmed.",
  phone: "(520) 225-9713", // confirmed 2026-07-23
  // Mailbox not yet provisioned; email sending is blocked until DNS/provider setup.
  email: "support@curbsitter.com", // confirmed 2026-07-23
  domain: "curbsitter.com", // confirmed 2026-07-23; canonical site https://www.curbsitter.com
} as const;

export const PLANS: Record<PlanId, PlanConfig> = {
  home: {
    id: "home",
    publicName: "CurbSitter Home",
    monthlyPriceCents: 6500,
    quarterlyPriceCents: 16500,
    quarterlyPaymentMethod: "card_or_ach_prepaid",
    maxBins: 3,
    collectionCoverage: "one_regular_day_per_week",
    includesTrashAndRecyclingWithinCoveredDays: true,
    summary:
      "Up to 3 bins, one regular collection day each week. Trash and recycling included when they fall on your covered day.",
  },
  complete: {
    id: "complete",
    publicName: "CurbSitter Complete",
    monthlyPriceCents: 8500,
    quarterlyPriceCents: 22500,
    quarterlyPaymentMethod: "card_or_ach_prepaid",
    maxBins: 6,
    collectionCoverage: "all_regular_collection_days",
    includesTrashAndRecyclingWithinCoveredDays: true,
    summary:
      "Up to 6 bins, every regular trash and recycling collection day at the address. Best for separate collection days, second homes, and rentals.",
  },
};

export const COMMUNITY_PORTFOLIO = {
  pricing: "custom_quote",
  centralizedReporting: true,
  multiPropertyControls: true,
} as const;

export const ONE_TIME = {
  trashDayPublicName: "CurbSitter onDemand",
  trashDayPriceCents: 2500,
  trashDayIncludedBins: 3,
  trashDayRequiresActiveRoute: true,
  trashDayRequiresCapacity: true,
} as const;

export const SERVICE_WINDOWS = {
  rolloutStartLocal: "17:00",
  rolloutEndLocal: "22:00",
  returnTarget: "after_confirmed_collection_same_day",
  returnFallback: "published_next_day_window",
} as const;

export const REFERRALS = {
  // Reverted 2026-07-31 (D-014) to Give $20/Get $20 — the 2026-07-27 $10/$10
  // reduction had less pull than the original amount. Was 1000/1000.
  advocateCreditCents: 2000,
  referredCustomerCreditCents: 2000,
  qualifyingEvent: "first_paid_collection_cycle_completed",
  // confirmed 2026-07-23: no monthly cap. `null` = uncapped; the admin approval
  // path only enforces a ceiling when this is non-null.
  monthlyCreditCapCents: null as number | null,
} as const;

export const NOTIFICATIONS = {
  emailDefault: true,
  smsRequiresExplicitOptIn: true,
  marketingSmsDefault: false,
} as const;

export const STORAGE_POLICY = {
  proofBucketVisibility: "private",
  signedUrlTtlSeconds: 3600,
  defaultPhotoRetentionDays: 180,
  accessDataRetention: "active_account_plus_90_days",
} as const;

export const SERVICE_AREA = {
  mode: "route_cell_and_address",
  zipOnlyValidationProhibited: true,
  /** No route cells are publicly active yet; activation is an admin decision (OWNER_CONFIRM). */
  publicActiveCells: [] as string[],
  publicWaitlistCells: [] as string[],
} as const;

export function formatCents(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

/**
 * Server-side price lookup. The server always recalculates price from this
 * config; client-provided totals are never trusted (API_CONTRACT.md).
 */
export function getPlanPriceCents(planId: PlanId, interval: BillingInterval): number {
  const plan = PLANS[planId];
  return interval === "monthly" ? plan.monthlyPriceCents : plan.quarterlyPriceCents;
}

/**
 * The quarterly charge expressed as a discounted per-month rate, for display in
 * the pricing toggle (D-004 revision, 2026-07-27). The customer is still charged
 * the full quarterly amount (`quarterlyPriceCents`) once every three months.
 */
export function quarterlyMonthlyEquivalentCents(planId: PlanId): number {
  return Math.round(PLANS[planId].quarterlyPriceCents / 3);
}
