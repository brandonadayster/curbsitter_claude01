import { describe, expect, it } from "vitest";

import {
  firstPickupDate,
  formatPhoenixDate,
  nextOccurrenceOfWeekday,
  phoenixWeekday,
  previousDay,
} from "@/lib/phoenix-date";

/**
 * D-024's lead-time floor. Getting this wrong is a full week off, in the
 * direction the customer notices — either a promised date the operation
 * can't staff (rollout the same evening at a property nobody has visited),
 * or a needlessly delayed first pickup.
 *
 * Fixed dates throughout; nothing here reads the clock.
 */

// 2026-08-05 is a Wednesday (weekday 3).
const WED = "2026-08-05";
const LEAD = 2;

describe("firstPickupDate", () => {
  it("keeps a day that already clears the floor", () => {
    // Wednesday + 2 = Friday, so Friday (5) is exactly reachable.
    expect(firstPickupDate(5, WED, LEAD)).toBe("2026-08-07");
    expect(phoenixWeekday("2026-08-07")).toBe(5);
  });

  it("allows the exact boundary rather than bumping past it", () => {
    // The floor is a minimum, not a strict inequality: Friday is 2 days out
    // and must be allowed. This is the off-by-one that would silently cost
    // every affected customer a week.
    const result = firstPickupDate(5, WED, LEAD);
    expect(result).toBe("2026-08-07");
    expect(result).not.toBe("2026-08-14");
  });

  it("pushes a day inside the floor to the following week", () => {
    // Thursday is tomorrow — rollout would be tonight. Bump a week.
    expect(nextOccurrenceOfWeekday(4, WED)).toBe("2026-08-06");
    expect(firstPickupDate(4, WED, LEAD)).toBe("2026-08-13");
  });

  it("pushes today's own weekday a full week out", () => {
    // nextOccurrenceOfWeekday is already strictly-after, so this lands next
    // Wednesday (7 days) — comfortably past the floor, unchanged.
    expect(firstPickupDate(3, WED, LEAD)).toBe("2026-08-12");
  });

  it("reduces to the plain next occurrence when there is no floor", () => {
    for (let weekday = 0; weekday < 7; weekday += 1) {
      expect(firstPickupDate(weekday, WED, 0)).toBe(nextOccurrenceOfWeekday(weekday, WED));
    }
  });

  it("always lands on the requested weekday, floor or not", () => {
    for (let weekday = 0; weekday < 7; weekday += 1) {
      expect(phoenixWeekday(firstPickupDate(weekday, WED, LEAD))).toBe(weekday);
    }
  });

  it("never returns a date earlier than the floor allows", () => {
    for (let weekday = 0; weekday < 7; weekday += 1) {
      expect(firstPickupDate(weekday, WED, LEAD) >= "2026-08-07").toBe(true);
    }
  });

  it("handles a floor longer than a week by skipping whole weeks", () => {
    // Guards the loop: a 10-day floor from Wednesday rules out next
    // Thursday (Aug 13) and lands on the one after (Aug 20).
    expect(firstPickupDate(4, WED, 10)).toBe("2026-08-20");
  });

  it("leaves rollout the evening before the pickup it floors", () => {
    const pickup = firstPickupDate(4, WED, LEAD);
    expect(previousDay(pickup)).toBe("2026-08-12");
  });

  it("crosses a month boundary correctly", () => {
    // Monday 2026-08-31 -> the Tuesday inside the floor bumps into September.
    expect(firstPickupDate(1, "2026-08-31", LEAD)).toBe("2026-09-07");
  });
});

describe("formatPhoenixDate", () => {
  it("renders a collection date the way the customer sees it", () => {
    expect(formatPhoenixDate("2026-08-07")).toBe("Friday, August 7");
  });

  it("does not drift across the UTC day boundary", () => {
    // Phoenix is UTC-7 year-round; a naive parse would render Aug 6 here.
    expect(formatPhoenixDate("2026-08-07")).toContain("August 7");
  });
});
