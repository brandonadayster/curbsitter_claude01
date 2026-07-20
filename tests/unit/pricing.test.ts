import { describe, expect, it } from "vitest";

import { buildQuote } from "@/lib/pricing";
import type { Stage3 } from "@/lib/onboarding-schemas";

function stage3(overrides: Partial<Stage3> = {}): Stage3 {
  return {
    serviceChoice: "home",
    billingInterval: "monthly",
    binCount: 2,
    binTypes: ["trash"],
    collectionProvider: "",
    collectionDay: 2,
    collectionDayUnsure: false,
    binStorageLocation: "Side yard by the gate",
    curbPlacementNotes: "",
    hazards: [],
    accessSecretNotes: "",
    ...overrides,
  };
}

describe("buildQuote", () => {
  it("prices Home monthly at $59", () => {
    const quote = buildQuote(stage3());
    expect(quote.amountDueCents).toBe(5900);
    expect(quote.recurrence).toBe("monthly");
    expect(quote.binLimitOk).toBe(true);
  });

  it("prices Home quarterly at $159 prepaid ACH", () => {
    const quote = buildQuote(stage3({ billingInterval: "quarterly" }));
    expect(quote.amountDueCents).toBe(15900);
    expect(quote.description).toContain("ACH");
  });

  it("prices Complete quarterly at $240", () => {
    const quote = buildQuote(stage3({ serviceChoice: "complete", billingInterval: "quarterly" }));
    expect(quote.amountDueCents).toBe(24000);
  });

  it("prices One-Time Trash Day at $39 with no recurrence", () => {
    const quote = buildQuote(stage3({ serviceChoice: "one_time_trash_day" }));
    expect(quote.amountDueCents).toBe(3900);
    expect(quote.recurrence).toBe("one_time");
    expect(quote.billingInterval).toBeNull();
  });

  it("flags access review for complex access instead of adding a surcharge", () => {
    const base = buildQuote(stage3());
    const gated = buildQuote(stage3({ hazards: ["gate", "steep_grade"] }));
    expect(gated.requiresAccessReview).toBe(true);
    // No-surprise policy: same price, review flag only.
    expect(gated.amountDueCents).toBe(base.amountDueCents);
  });

  it("does not flag review for informational hazards", () => {
    const quote = buildQuote(stage3({ hazards: ["poor_lighting", "ice"] }));
    expect(quote.requiresAccessReview).toBe(false);
  });

  it("reports bin-limit violations for the chosen plan", () => {
    expect(buildQuote(stage3({ binCount: 4 })).binLimitOk).toBe(false);
    expect(buildQuote(stage3({ serviceChoice: "complete", binCount: 4 })).binLimitOk).toBe(true);
    expect(
      buildQuote(stage3({ serviceChoice: "one_time_trash_day", binCount: 4 })).binLimitOk,
    ).toBe(false);
  });
});
