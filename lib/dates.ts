import {
  NIGHT_SWIM_DAY,
  NIGHT_SWIM_PRICE,
  NIGHT_SWIM_TIME,
  TIME_ZONE,
  WEEKEND_DAYS,
  WEEKDAY_PRICE,
  WEEKEND_PRICE,
  type SwimSession,
} from "./config";

// Dates are passed around as plain "YYYY-MM-DD" strings so that no time zone
// conversion can shift a booking to a neighbouring day.

export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** 0 = Sunday … 6 = Saturday, derived from the calendar date itself. */
export function dayOfWeek(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

export function isWeekend(date: string): boolean {
  return WEEKEND_DAYS.includes(dayOfWeek(date));
}

export function priceForDate(date: string): number {
  return isWeekend(date) ? WEEKEND_PRICE : WEEKDAY_PRICE;
}

/** True when the date falls on the weekday night swims run (Thursday). */
export function isNightSwimDay(date: string): boolean {
  return dayOfWeek(date) === NIGHT_SWIM_DAY;
}

/** Price per guest for a given session. Night swims are a flat price on
 *  any day; day swims follow the weekday/weekend rate. */
export function priceForSession(date: string, session: SwimSession): number {
  return session === "night" ? NIGHT_SWIM_PRICE : priceForDate(date);
}

/** Human "when" label for a booking, including the night-swim window so
 *  confirmations and reminders make the evening slot unmistakable. */
export function whenLabel(date: string, session: SwimSession): string {
  return session === "night"
    ? `${formatDateLong(date)} · Night swim (${NIGHT_SWIM_TIME})`
    : formatDateLong(date);
}

/** Today's date in the club's time zone, as YYYY-MM-DD. */
export function today(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** e.g. "Friday, 7 August 2026" */
export function formatDateLong(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00Z`));
}

/** e.g. "Fri 7 Aug" */
export function formatDateShort(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T00:00:00Z`));
}
