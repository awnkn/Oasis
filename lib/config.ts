// Central configuration for the Oasis club booking system.

export const CLUB_NAME = "Oasis by Azara";

export const CURRENCY = "JOD";

// Entry price per guest, in JOD.
export const WEEKDAY_PRICE = 25;
export const WEEKEND_PRICE = 30;

// Jordan's weekend: Friday (5) and Saturday (6). 0 = Sunday … 6 = Saturday.
export const WEEKEND_DAYS: number[] = [5, 6];

// ---------- swim sessions (day pass vs. night swim) ----------

// A booking is for one of two sessions on its date. Day is the ordinary
// daytime pass; night is the Thursday-evening swim at a flat price.
export const SWIM_SESSIONS = ["day", "night"] as const;
export type SwimSession = (typeof SWIM_SESSIONS)[number];

export const SWIM_SESSION_LABELS: Record<SwimSession, string> = {
  day: "Day swim",
  night: "Night swim",
};

// Night swim: flat entry price, one weekday only, fixed evening hours.
export const NIGHT_SWIM_PRICE = 15;
// 0 = Sunday … 6 = Saturday. Night swims run on Thursdays.
export const NIGHT_SWIM_DAY = 4;
export const NIGHT_SWIM_START = "6:30 PM";
export const NIGHT_SWIM_END = "10:30 PM";
export const NIGHT_SWIM_TIME = `${NIGHT_SWIM_START} – ${NIGHT_SWIM_END}`;

// Default daily guest capacity. The live value is stored in the database
// and can be reduced (or raised back up) from the admin dashboard.
export const DEFAULT_DAILY_CAPACITY = 300;

// How far ahead guests are allowed to book, in days.
export const MAX_ADVANCE_DAYS = 90;

// All "what day is it" logic runs in the club's local time zone.
export const TIME_ZONE = "Asia/Amman";

// Age policy: Fridays and Sundays welcome ages 10+, all other days 16+.
// Guests under 18 must be accompanied by a guardian aged 18+.
export const AGE_YOUNG = 10;
export const AGE_STANDARD = 16;
export const AGE_GUARDIAN = 18;
// Days (0 = Sunday … 6 = Saturday) that welcome the younger minimum age.
export const AGE_YOUNG_DAYS: number[] = [0, 5]; // Sunday and Friday
export const AGE_YOUNG_DAYS_LABEL = "Fridays and Sundays";

// Options for "Where did you hear about us?" on the booking form.
export const HEARD_ABOUT_OPTIONS = [
  "Instagram",
  "TikTok",
  "Facebook",
  "Google",
  "A friend",
  "Other",
] as const;

// Guest relationship statuses (separate from booking approval).
// "cancelled_no_response" is set automatically by the 24-hour sweep;
// "no_show" is set by staff for a confirmed guest who never arrived.
export const GUEST_STATUSES = [
  "open",
  "contacted",
  "follow_up",
  "no_response",
  "confirmed",
  "checked_in",
  "no_show",
  "wrong_number",
  "cancelled",
  "cancelled_no_response",
] as const;

export type GuestStatus = (typeof GUEST_STATUSES)[number];

export const GUEST_STATUS_LABELS: Record<GuestStatus, string> = {
  open: "Open",
  contacted: "Contacted",
  follow_up: "Follow up",
  no_response: "No response",
  confirmed: "Confirmed",
  checked_in: "Checked in",
  no_show: "No show",
  wrong_number: "Wrong number",
  cancelled: "Cancelled",
  cancelled_no_response: "Cancelled (no response)",
};

// How long a booking may sit at "No response" before it auto-cancels.
export const NO_RESPONSE_CANCEL_HOURS = 24;

// The three accounts collected money is recorded under (admin side).
export const PAYMENT_ACCOUNTS = ["Cash", "CliQ", "Visa"] as const;

// What guests can pick on the booking form (Visa hidden for now).
export const GUEST_PAYMENT_METHODS = ["Cash", "CliQ"] as const;

// Acknowledgements every guest must accept before booking.
export const BOOKING_TERMS = [
  "I understand that booking changes must be made at least 24 hours before my reservation. If cancelled in time, my booking can be transferred to a new booking date.",
  "I understand that same day cancellations and no shows will result in the loss of my booking.",
  `I understand that Oasis is exclusively for guests aged ${AGE_STANDARD} and above, except ${AGE_YOUNG_DAYS_LABEL} where ages ${AGE_YOUNG}+ are welcome.`,
  `I acknowledge the entrance fee of ${WEEKDAY_PRICE} JOD on weekdays and ${WEEKEND_PRICE} JOD on weekends, and ${NIGHT_SWIM_PRICE} JOD for the Thursday night swim.`,
  "Seating at all pool areas, including the Shisha Pool, is available on a first come, first served basis and cannot be reserved or guaranteed.",
] as const;
