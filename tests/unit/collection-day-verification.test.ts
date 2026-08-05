import { describe, expect, it } from "vitest";

import { combineDayCheck, type CityLookup } from "@/lib/collection-day-verification";

/**
 * D-025/D-027: `combineDayCheck` decides whether a signup can skip admin
 * review, so every cell of the matrix matters — a wrong "verified" here
 * activates service against a day nobody confirmed.
 */

const CHECKED_AT = "2026-08-04T12:00:00.000Z";

const found = (cityWeekday: number): CityLookup => ({
  status: "found",
  cityWeekday,
  checkedAt: CHECKED_AT,
});
const notFound: CityLookup = { status: "not_found", cityWeekday: null, checkedAt: CHECKED_AT };
const geocodeFailed: CityLookup = {
  status: "geocode_failed",
  cityWeekday: null,
  checkedAt: CHECKED_AT,
};

describe("combineDayCheck", () => {
  it("matches when the customer's day equals the City's", () => {
    const result = combineDayCheck(found(4), 4, CHECKED_AT);
    expect(result.status).toBe("match");
    expect(result.cityWeekday).toBe(4);
    expect(result.customerWeekday).toBe(4);
  });

  it("flags a mismatch when the days differ", () => {
    const result = combineDayCheck(found(4), 1, CHECKED_AT);
    expect(result.status).toBe("mismatch");
    expect(result.cityWeekday).toBe(4);
    expect(result.customerWeekday).toBe(1);
  });

  it("adopts the City's day when the customer doesn't know theirs", () => {
    const result = combineDayCheck(found(4), null, CHECKED_AT);
    expect(result.status).toBe("city_resolved");
    // The City's day becomes the property's day, not just a suggestion.
    expect(result.customerWeekday).toBe(4);
    expect(result.cityWeekday).toBe(4);
  });

  it("accepts a self-reported day the City has no record for", () => {
    // The private-hauler case: unremarkable, proceeds as plain self-report.
    const result = combineDayCheck(notFound, 2, CHECKED_AT);
    expect(result.status).toBe("no_zone_data");
    expect(result.customerWeekday).toBe(2);
    expect(result.cityWeekday).toBeNull();
  });

  it("has no day at all when the customer is unsure and the City has no record", () => {
    const result = combineDayCheck(notFound, null, CHECKED_AT);
    expect(result.status).toBe("unsure_no_data");
    expect(result.customerWeekday).toBeNull();
    expect(result.cityWeekday).toBeNull();
  });

  it("reports a geocode failure regardless of the customer's answer", () => {
    expect(combineDayCheck(geocodeFailed, 3, CHECKED_AT).status).toBe("geocode_failed");
    expect(combineDayCheck(geocodeFailed, null, CHECKED_AT).status).toBe("geocode_failed");
  });

  it("treats a 'found' lookup with no weekday as no City data", () => {
    // Defensive: a zone row whose day_of_service was null shouldn't read as a
    // verified day just because a polygon matched.
    const malformed: CityLookup = { status: "found", cityWeekday: null, checkedAt: CHECKED_AT };
    expect(combineDayCheck(malformed, 2, CHECKED_AT).status).toBe("no_zone_data");
    expect(combineDayCheck(malformed, null, CHECKED_AT).status).toBe("unsure_no_data");
  });

  it("never returns a verified status without a concrete day", () => {
    const verifiedStatuses = ["match", "city_resolved"];
    const cases = [
      combineDayCheck(notFound, null, CHECKED_AT),
      combineDayCheck(geocodeFailed, null, CHECKED_AT),
      combineDayCheck(found(4), 1, CHECKED_AT),
    ];
    for (const result of cases) {
      expect(verifiedStatuses).not.toContain(result.status);
    }
  });
});
