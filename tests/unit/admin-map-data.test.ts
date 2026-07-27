import { describe, expect, it } from "vitest";

import {
  matchesPropertySearch,
  matchesRouteCellSearch,
  PROPERTY_STATUS_COLORS,
  PROPERTY_STATUS_LABELS,
} from "@/components/map/admin-map-data";

const cell = { name: "Prescott Lakes", slug: "prescott-lakes" };
const pin = { addressLine1: "88 Playwright Way", city: "Prescott", accountName: "Playwright Household" };

describe("matchesRouteCellSearch", () => {
  it("matches everything on an empty query", () => {
    expect(matchesRouteCellSearch(cell, "")).toBe(true);
    expect(matchesRouteCellSearch(cell, "   ")).toBe(true);
  });

  it("matches the name case-insensitively", () => {
    expect(matchesRouteCellSearch(cell, "prescott")).toBe(true);
    expect(matchesRouteCellSearch(cell, "PRESCOTT LAKES")).toBe(true);
  });

  it("matches the slug", () => {
    expect(matchesRouteCellSearch(cell, "prescott-lakes")).toBe(true);
  });

  it("returns false when nothing matches", () => {
    expect(matchesRouteCellSearch(cell, "stoneridge")).toBe(false);
  });
});

describe("matchesPropertySearch", () => {
  it("matches everything on an empty query", () => {
    expect(matchesPropertySearch(pin, "")).toBe(true);
  });

  it("matches the address line", () => {
    expect(matchesPropertySearch(pin, "playwright way")).toBe(true);
  });

  it("matches the city", () => {
    expect(matchesPropertySearch(pin, "PRESCOTT")).toBe(true);
  });

  it("matches the owning account's name — the HOA/subdivision search proxy", () => {
    expect(matchesPropertySearch(pin, "Playwright Household")).toBe(true);
  });

  it("returns false when nothing matches", () => {
    expect(matchesPropertySearch(pin, "stoneridge")).toBe(false);
  });
});

describe("PROPERTY_STATUS_LABELS / PROPERTY_STATUS_COLORS completeness", () => {
  const knownStatuses = ["pending_review", "active", "paused", "declined", "closed"] as const;

  it("has a label and a color for every known property status", () => {
    for (const status of knownStatuses) {
      expect(PROPERTY_STATUS_LABELS[status]).toBeTruthy();
      expect(PROPERTY_STATUS_COLORS[status]).toBeTruthy();
    }
  });
});
