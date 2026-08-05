import { describe, expect, it } from "vitest";

import { buildQuote } from "@/lib/pricing";
import type { Stage3 } from "@/lib/onboarding-schemas";

function stage3(overrides: Partial<Stage3> = {}): Stage3 {
  return {
    serviceChoice: "home",
    billingInterval: "monthly",
    hasBothBinTypes: false,
    trashBinCount: 2,
    recyclingBinCount: 0,
    collectionProviderKind: "city",
    collectionProvider: "",
    collectionDay: 2,
    collectionDayUnsure: false,
    sameDayCollection: null,
    recyclingCollectionDay: null,
    recyclingCollectionDayUnsure: false,
    binStorageLocation: "Side yard by the gate",
    curbPlacementNotes: "",
    hazards: [],
    accessSecretNotes: "",
    ...overrides,
  };
}

describe("buildQuote", () => {
  it("prices Home monthly at $65", () => {
    const quote = buildQuote(stage3());
    expect(quote.amountDueCents).toBe(6500);
    expect(quote.recurrence).toBe("monthly");
    expect(quote.binLimitOk).toBe(true);
  });

  it("charges the full quarter ($165) for Home quarterly, prepaid", () => {
    const quote = buildQuote(stage3({ billingInterval: "quarterly" }));
    expect(quote.amountDueCents).toBe(16500);
    expect(quote.description).toContain("quarterly");
  });

  it("charges the full quarter ($225) for Complete quarterly", () => {
    const quote = buildQuote(stage3({ serviceChoice: "complete", billingInterval: "quarterly" }));
    expect(quote.amountDueCents).toBe(22500);
  });

  it("prices CurbSitter onDemand at $25 with no recurrence", () => {
    const quote = buildQuote(stage3({ serviceChoice: "one_time_trash_day" }));
    expect(quote.amountDueCents).toBe(2500);
    expect(quote.description).toBe("CurbSitter onDemand");
    expect(quote.recurrence).toBe("one_time");
    expect(quote.billingInterval).toBeNull();
  });

  it("never lets hazards change the price", () => {
    // No-surprise policy: complex access is an operational matter, never a
    // silent surcharge. D-026 also removed the review flag it used to set,
    // so the quote must now be identical in every respect.
    const base = buildQuote(stage3());
    expect(buildQuote(stage3({ hazards: ["gate", "steep_grade"] }))).toEqual(base);
    expect(buildQuote(stage3({ hazards: ["poor_lighting", "ice"] }))).toEqual(base);
  });

  it("reports bin-limit violations for the chosen plan", () => {
    expect(buildQuote(stage3({ trashBinCount: 4 })).binLimitOk).toBe(false);
    expect(buildQuote(stage3({ serviceChoice: "complete", trashBinCount: 4 })).binLimitOk).toBe(true);
    expect(
      buildQuote(stage3({ serviceChoice: "one_time_trash_day", trashBinCount: 4 })).binLimitOk,
    ).toBe(false);
  });

  it("sums trash and recycling counts against the plan's bin limit", () => {
    expect(
      buildQuote(stage3({ hasBothBinTypes: true, trashBinCount: 2, recyclingBinCount: 1 })).binLimitOk,
    ).toBe(true);
    expect(
      buildQuote(stage3({ hasBothBinTypes: true, trashBinCount: 2, recyclingBinCount: 2 })).binLimitOk,
    ).toBe(false);
  });
});
