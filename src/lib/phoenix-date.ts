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

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00${PHOENIX_OFFSET}`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * The first pickup date for a property we've never visited (D-024), honouring
 * a minimum lead time. Rollout is the evening before collection, so without a
 * floor the soonest occurrence can demand same-evening rollout at a property
 * whose access nobody has confirmed.
 *
 * Callers pass `leadDays` from `SERVICE_WINDOWS.firstPickupLeadDays` — this
 * module stays a config-free leaf so it remains safe in the client bundle.
 *
 * Both the displayed date and the booked date come from here, so a customer
 * is never shown one date and scheduled another.
 */
export function firstPickupDate(
  weekday: number,
  fromDateExclusive: string,
  leadDays: number,
): string {
  const earliest = addDays(fromDateExclusive, leadDays);
  let date = nextOccurrenceOfWeekday(weekday, fromDateExclusive);
  // ISO YYYY-MM-DD compares lexicographically. A loop rather than a single
  // bump so this stays correct if the floor ever exceeds a week.
  while (date < earliest) {
    date = nextOccurrenceOfWeekday(weekday, date);
  }
  return date;
}

/** A collection date as "Thursday, August 7" in Phoenix time. */
export function formatPhoenixDate(date: string): string {
  return new Date(`${date}T12:00:00${PHOENIX_OFFSET}`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "America/Phoenix",
  });
}
