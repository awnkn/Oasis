// Central configuration for the Oasis club booking system.

export const CLUB_NAME = "Oasis Ladies Swimming Club";
export const CLUB_TAGLINE = "A private day of calm, sun and water — for ladies only.";

export const CURRENCY = "JOD";

// Entry price per guest, in JOD.
export const WEEKDAY_PRICE = 25;
export const WEEKEND_PRICE = 30;

// Jordan's weekend: Friday (5) and Saturday (6). 0 = Sunday … 6 = Saturday.
export const WEEKEND_DAYS: number[] = [5, 6];

// Default daily guest capacity. The live value is stored in the database
// and can be reduced (or raised back up) from the admin dashboard.
export const DEFAULT_DAILY_CAPACITY = 300;

// How far ahead guests are allowed to book, in days.
export const MAX_ADVANCE_DAYS = 90;

// All "what day is it" logic runs in the club's local time zone.
export const TIME_ZONE = "Asia/Amman";
