import { describe, expect, it } from "vitest";

import {
  formatCents,
  getPlanPriceCents,
  ONE_TIME,
  PLANS,
  quarterlyMonthlyEquivalentCents,
  REFERRALS,
  SERVICE_AREA,
} from "@/config/business";

describe("pricing (Decision D-004, revised 2026-07-27)", () => {
  it("prices CurbSitter Home at $65/month and $165/quarter with 3 bins", () => {
    expect(PLANS.home.monthlyPriceCents).toBe(6500);
    expect(PLANS.home.quarterlyPriceCents).toBe(16500);
    expect(PLANS.home.maxBins).toBe(3);
    expect(PLANS.home.collectionCoverage).toBe("one_regular_day_per_week");
  });

  it("prices CurbSitter Complete at $85/month and $225/quarter with 6 bins", () => {
    expect(PLANS.complete.monthlyPriceCents).toBe(8500);
    expect(PLANS.complete.quarterlyPriceCents).toBe(22500);
    expect(PLANS.complete.maxBins).toBe(6);
    expect(PLANS.complete.collectionCoverage).toBe("all_regular_collection_days");
  });

  it("keeps quarterly plans prepaid, payable by card or ACH (D-012 revised)", () => {
    expect(PLANS.home.quarterlyPaymentMethod).toBe("card_or_ach_prepaid");
    expect(PLANS.complete.quarterlyPaymentMethod).toBe("card_or_ach_prepaid");
  });

  it("shows quarterly as a discounted per-month rate ($55/$75) but charges the full quarter", () => {
    expect(quarterlyMonthlyEquivalentCents("home")).toBe(5500);
    expect(quarterlyMonthlyEquivalentCents("complete")).toBe(7500);
    // The per-month display is strictly less than the monthly-billed rate.
    expect(quarterlyMonthlyEquivalentCents("home")).toBeLessThan(PLANS.home.monthlyPriceCents);
    expect(quarterlyMonthlyEquivalentCents("complete")).toBeLessThan(PLANS.complete.monthlyPriceCents);
  });

  it("prices CurbSitter onDemand at $25 for up to 3 bins on active routes only", () => {
    expect(ONE_TIME.trashDayPublicName).toBe("CurbSitter onDemand");
    expect(ONE_TIME.trashDayPriceCents).toBe(2500);
    expect(ONE_TIME.trashDayIncludedBins).toBe(3);
    expect(ONE_TIME.trashDayRequiresActiveRoute).toBe(true);
    expect(ONE_TIME.trashDayRequiresCapacity).toBe(true);
  });

  it("no longer exposes Bulk Pickup Coordination config (D-007 retired)", () => {
    expect(ONE_TIME).not.toHaveProperty("bulkPickupCoordinationStartingCents");
    expect(ONE_TIME).not.toHaveProperty("bulkPhysicalPlacement");
  });
});

describe("referral rules (Decision D-014)", () => {
  it("is Give $20 / Get $20 after a qualifying completed paid cycle", () => {
    expect(REFERRALS.advocateCreditCents).toBe(2000);
    expect(REFERRALS.referredCustomerCreditCents).toBe(2000);
    expect(REFERRALS.qualifyingEvent).toBe("first_paid_collection_cycle_completed");
  });
});

describe("service-area policy", () => {
  it("prohibits zip-only validation and defaults to no publicly active cells", () => {
    expect(SERVICE_AREA.mode).toBe("route_cell_and_address");
    expect(SERVICE_AREA.zipOnlyValidationProhibited).toBe(true);
    expect(SERVICE_AREA.publicActiveCells).toEqual([]);
  });
});

describe("price helpers", () => {
  it("resolves plan prices server-side by plan and interval", () => {
    expect(getPlanPriceCents("home", "monthly")).toBe(6500);
    expect(getPlanPriceCents("home", "quarterly")).toBe(16500);
    expect(getPlanPriceCents("complete", "monthly")).toBe(8500);
    expect(getPlanPriceCents("complete", "quarterly")).toBe(22500);
  });

  it("formats whole and fractional dollar amounts", () => {
    expect(formatCents(6500)).toBe("$65");
    expect(formatCents(16500)).toBe("$165");
    expect(formatCents(4950)).toBe("$49.50");
  });
});
