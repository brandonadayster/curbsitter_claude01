import { describe, expect, it } from "vitest";

import {
  formatCents,
  getPlanPriceCents,
  ONE_TIME,
  PLANS,
  REFERRALS,
  SERVICE_AREA,
} from "@/config/business";

describe("locked v1.1 pricing (Decision D-004)", () => {
  it("keeps CurbSitter Home at $59/month and $159/quarter with 3 bins", () => {
    expect(PLANS.home.monthlyPriceCents).toBe(5900);
    expect(PLANS.home.quarterlyPriceCents).toBe(15900);
    expect(PLANS.home.maxBins).toBe(3);
    expect(PLANS.home.collectionCoverage).toBe("one_regular_day_per_week");
  });

  it("keeps CurbSitter Complete at $89/month and $240/quarter with 6 bins", () => {
    expect(PLANS.complete.monthlyPriceCents).toBe(8900);
    expect(PLANS.complete.quarterlyPriceCents).toBe(24000);
    expect(PLANS.complete.maxBins).toBe(6);
    expect(PLANS.complete.collectionCoverage).toBe("all_regular_collection_days");
  });

  it("keeps quarterly plans prepaid by ACH", () => {
    expect(PLANS.home.quarterlyPaymentMethod).toBe("ach_debit_prepaid");
    expect(PLANS.complete.quarterlyPaymentMethod).toBe("ach_debit_prepaid");
  });

  it("keeps One-Time Trash Day at $39 for up to 3 bins on active routes only", () => {
    expect(ONE_TIME.trashDayPriceCents).toBe(3900);
    expect(ONE_TIME.trashDayIncludedBins).toBe(3);
    expect(ONE_TIME.trashDayRequiresActiveRoute).toBe(true);
    expect(ONE_TIME.trashDayRequiresCapacity).toBe(true);
  });

  it("keeps Bulk Pickup Coordination starting at $49 with separate placement quote", () => {
    expect(ONE_TIME.bulkPickupCoordinationStartingCents).toBe(4900);
    expect(ONE_TIME.bulkPhysicalPlacement).toBe("separate_review_and_quote");
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
    expect(getPlanPriceCents("home", "monthly")).toBe(5900);
    expect(getPlanPriceCents("home", "quarterly")).toBe(15900);
    expect(getPlanPriceCents("complete", "monthly")).toBe(8900);
    expect(getPlanPriceCents("complete", "quarterly")).toBe(24000);
  });

  it("formats whole and fractional dollar amounts", () => {
    expect(formatCents(5900)).toBe("$59");
    expect(formatCents(15900)).toBe("$159");
    expect(formatCents(4950)).toBe("$49.50");
  });
});
