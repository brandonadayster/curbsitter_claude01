/**
 * Pure America/Phoenix date helpers shared by cycle generation, order
 * generation, and onboarding validation. No `server-only` import here —
 * `onboarding-schemas.ts` is used from a client component, so anything it
 * imports must be safe in the browser bundle. America/Phoenix has no DST, so
 * a fixed -07:00 offset is correct year-round.
 */

const PHOENIX_OFFSET = "-07:00";

export function phoenixTimestamp(date: string, time: string): string {
  return `${date}T${time}:00${PHOENIX_OFFSET}`;
}

export function previousDay(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function phoenixWeekday(date: string): number {
  // Weekday of the calendar date in Phoenix; noon UTC avoids boundary issues.
  return new Date(`${date}T12:00:00${PHOENIX_OFFSET}`).getUTCDay();
}

/** Today's date (America/Phoenix) as an ISO `YYYY-MM-DD` string. */
export function phoenixToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Phoenix" });
}

/**
 * The next date falling on `weekday`, strictly after `fromDateExclusive`.
 * Used to schedule a one-time visit from the property's collection day without
 * ever asking the customer for a calendar date — rollout is the evening before,
 * so the soonest serviceable pickup is always at least one full day out.
 */
export function nextOccurrenceOfWeekday(weekday: number, fromDateExclusive: string): string {
  const from = new Date(`${fromDateExclusive}T12:00:00${PHOENIX_OFFSET}`);
  const delta = (weekday - from.getUTCDay() + 7) % 7 || 7;
  from.setUTCDate(from.getUTCDate() + delta);
  return from.toISOString().slice(0, 10);
}
