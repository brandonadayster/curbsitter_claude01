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
  /** Quarterly plans are prepaid by ACH and renew every three months (D-004/D-012). */
  quarterlyPaymentMethod: "ach_debit_prepaid";
  maxBins: number;
  collectionCoverage: "one_regular_day_per_week" | "all_regular_collection_days";
  includesTrashAndRecyclingWithinCoveredDays: true;
  summary: string;
}

export const BUSINESS = {
  name: "CurbSitter",
  legalName: null as string | null, // OWNER_CONFIRM
  market: "Prescott, Arizona",
  timezone: "America/Phoenix",
  primaryTagline: "Trash day, handled.",
  serviceLine: "Bins out. Bins back. Photo-confirmed.",
  phone: null as string | null, // OWNER_CONFIRM
  email: null as string | null, // OWNER_CONFIRM
  domain: null as string | null, // OWNER_CONFIRM
} as const;

export const PLANS: Record<PlanId, PlanConfig> = {
  home: {
    id: "home",
    publicName: "CurbSitter Home",
    monthlyPriceCents: 5900,
    quarterlyPriceCents: 15900,
    quarterlyPaymentMethod: "ach_debit_prepaid",
    maxBins: 3,
    collectionCoverage: "one_regular_day_per_week",
    includesTrashAndRecyclingWithinCoveredDays: true,
    summary:
      "Up to 3 bins, one regular collection day each week. Trash and recycling included when they fall on your covered day.",
  },
  complete: {
    id: "complete",
    publicName: "CurbSitter Complete",
    monthlyPriceCents: 8900,
    quarterlyPriceCents: 24000,
    quarterlyPaymentMethod: "ach_debit_prepaid",
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
  trashDayPriceCents: 3900,
  trashDayIncludedBins: 3,
  trashDayRequiresActiveRoute: true,
  trashDayRequiresCapacity: true,
  bulkPickupCoordinationStartingCents: 4900,
  bulkPhysicalPlacement: "separate_review_and_quote",
} as const;

export const SERVICE_WINDOWS = {
  rolloutStartLocal: "17:00",
  rolloutEndLocal: "22:00",
  returnTarget: "after_confirmed_collection_same_day",
  returnFallback: "published_next_day_window",
} as const;

export const REFERRALS = {
  advocateCreditCents: 2000,
  referredCustomerCreditCents: 2000,
  qualifyingEvent: "first_paid_collection_cycle_completed",
  monthlyCreditCapCents: null as number | null, // OWNER_CONFIRM
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
