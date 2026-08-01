import { getDb } from "./db";
import {
  DEFAULT_DAILY_CAPACITY,
  HEARD_ABOUT_OPTIONS,
  MAX_ADVANCE_DAYS,
} from "./config";
import { addDays, isValidDateString, priceForDate, today } from "./dates";

export type BookingStatus = "pending" | "approved" | "rejected";

export const BOOKING_STATUSES: BookingStatus[] = [
  "pending",
  "approved",
  "rejected",
];

export type RateType = "standard" | "discounted" | "complimentary";

export const RATE_TYPES: RateType[] = [
  "standard",
  "discounted",
  "complimentary",
];

export interface Booking {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  date: string;
  guests: number;
  price_per_guest: number;
  total_price: number;
  status: BookingStatus;
  rate_type: RateType;
  paid_amount: number | null;
  heard_about: string | null;
  notes: string | null;
  created_at: string;
}

export interface NewBookingInput {
  name: string;
  phone: string;
  email?: string;
  date: string;
  guests: number;
  heardAbout?: string[];
  notes?: string;
  termsAccepted?: boolean;
}

export type CreateResult =
  | { ok: true; booking: Booking }
  | { ok: false; error: string };

// ---------- settings ----------

export function getDailyCapacity(): number {
  const row = getDb()
    .prepare("SELECT value FROM settings WHERE key = 'daily_capacity'")
    .get() as { value: string } | undefined;
  const parsed = row ? Number.parseInt(row.value, 10) : NaN;
  return Number.isFinite(parsed) && parsed >= 0
    ? parsed
    : DEFAULT_DAILY_CAPACITY;
}

export function setDailyCapacity(capacity: number): void {
  if (!Number.isInteger(capacity) || capacity < 0) {
    throw new Error("Capacity must be a non-negative whole number.");
  }
  getDb()
    .prepare(
      `INSERT INTO settings (key, value) VALUES ('daily_capacity', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    )
    .run(String(capacity));
}

// ---------- availability ----------

/** Guests already counted against capacity: pending + approved bookings. */
export function bookedGuestsOn(date: string): number {
  const row = getDb()
    .prepare(
      `SELECT COALESCE(SUM(guests), 0) AS total FROM bookings
       WHERE date = ? AND status IN ('pending', 'approved')`
    )
    .get(date) as { total: number };
  return row.total;
}

export function remainingOn(date: string): number {
  return Math.max(0, getDailyCapacity() - bookedGuestsOn(date));
}

// ---------- bookings ----------

export function createBooking(input: NewBookingInput): CreateResult {
  const name = input.name?.trim() ?? "";
  const phone = input.phone?.trim() ?? "";
  const email = input.email?.trim() || null;
  const notes = input.notes?.trim() || null;
  const date = input.date?.trim() ?? "";
  const guests = input.guests;

  if (name.length < 2 || name.length > 100) {
    return { ok: false, error: "Please enter your full name." };
  }
  if (phone.length < 6 || phone.length > 30) {
    return { ok: false, error: "Please enter a valid phone number." };
  }
  if (!email || email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (notes && notes.length > 500) {
    return { ok: false, error: "Notes are too long (500 characters max)." };
  }

  const heardAbout =
    Array.isArray(input.heardAbout) && input.heardAbout.length > 0
      ? [
          ...new Set(
            input.heardAbout.filter((o) =>
              (HEARD_ABOUT_OPTIONS as readonly string[]).includes(o)
            )
          ),
        ].join(", ") || null
      : null;
  if (input.termsAccepted !== true) {
    return { ok: false, error: "Please accept the booking terms to continue." };
  }
  if (!isValidDateString(date)) {
    return { ok: false, error: "Please choose a valid date." };
  }

  const todayStr = today();
  if (date < todayStr) {
    return { ok: false, error: "That date has already passed." };
  }
  if (date > addDays(todayStr, MAX_ADVANCE_DAYS)) {
    return {
      ok: false,
      error: `Bookings open up to ${MAX_ADVANCE_DAYS} days in advance.`,
    };
  }
  if (!Number.isInteger(guests) || guests < 1) {
    return { ok: false, error: "Please enter how many guests are coming." };
  }

  const db = getDb();
  const insert = db.transaction((): CreateResult => {
    const remaining = remainingOn(date);
    if (remaining <= 0) {
      return { ok: false, error: "This day is fully booked. Please pick another date." };
    }
    if (guests > remaining) {
      return {
        ok: false,
        error:
          "There isn't enough space left on this day for your group size. Please try a smaller group or another date.",
      };
    }

    const pricePerGuest = priceForDate(date);
    const result = db
      .prepare(
        `INSERT INTO bookings (name, phone, email, date, guests, price_per_guest, total_price, heard_about, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(name, phone, email, date, guests, pricePerGuest, pricePerGuest * guests, heardAbout, notes);

    const booking = getBooking(Number(result.lastInsertRowid));
    if (!booking) return { ok: false, error: "Something went wrong. Please try again." };
    return { ok: true, booking };
  });

  return insert();
}

export function getBooking(id: number): Booking | undefined {
  return getDb()
    .prepare("SELECT * FROM bookings WHERE id = ?")
    .get(id) as Booking | undefined;
}

export interface BookingFilters {
  status?: BookingStatus;
  date?: string;
  includePast?: boolean;
}

export function listBookings(filters: BookingFilters = {}): Booking[] {
  const where: string[] = [];
  const params: (string | number)[] = [];

  if (filters.status) {
    where.push("status = ?");
    params.push(filters.status);
  }
  if (filters.date) {
    where.push("date = ?");
    params.push(filters.date);
  } else if (!filters.includePast) {
    where.push("date >= ?");
    params.push(today());
  }

  const sql = `
    SELECT * FROM bookings
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY date ASC, created_at ASC
  `;
  return getDb().prepare(sql).all(...params) as Booking[];
}

export type StatusUpdateResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "capacity"; message: string };

export function updateBookingStatus(
  id: number,
  status: BookingStatus
): StatusUpdateResult {
  const db = getDb();
  const update = db.transaction((): StatusUpdateResult => {
    const booking = getBooking(id);
    if (!booking) {
      return { ok: false, reason: "not_found", message: "Booking not found." };
    }

    // Bringing a rejected booking back puts its guests on the day again, so
    // the capacity check must pass a second time (the spots may have been
    // rebooked meanwhile). Past days are over — no capacity to protect.
    if (
      booking.status === "rejected" &&
      status !== "rejected" &&
      booking.date >= today()
    ) {
      const remaining = remainingOn(booking.date);
      if (booking.guests > remaining) {
        return {
          ok: false,
          reason: "capacity",
          message: `Cannot restore this booking: it has ${booking.guests} guests but only ${remaining} ${remaining === 1 ? "spot is" : "spots are"} left on that day.`,
        };
      }
    }

    db.prepare("UPDATE bookings SET status = ? WHERE id = ?").run(status, id);
    return { ok: true };
  });
  return update();
}

export interface PaymentUpdate {
  rateType?: RateType;
  /** Amount actually collected, in JOD. Pass null to clear it. */
  paidAmount?: number | null;
}

export type PaymentUpdateResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "invalid"; message: string };

export function updateBookingPayment(
  id: number,
  update: PaymentUpdate
): PaymentUpdateResult {
  const sets: string[] = [];
  const params: (string | number | null)[] = [];

  if (update.rateType !== undefined) {
    if (!RATE_TYPES.includes(update.rateType)) {
      return { ok: false, reason: "invalid", message: "Unknown rate type." };
    }
    sets.push("rate_type = ?");
    params.push(update.rateType);
  }
  if (update.paidAmount !== undefined) {
    if (update.paidAmount !== null) {
      if (
        typeof update.paidAmount !== "number" ||
        !Number.isFinite(update.paidAmount) ||
        update.paidAmount < 0 ||
        update.paidAmount > 100000
      ) {
        return {
          ok: false,
          reason: "invalid",
          message: "Paid amount must be between 0 and 100000 JOD.",
        };
      }
    }
    sets.push("paid_amount = ?");
    params.push(update.paidAmount);
  }
  if (sets.length === 0) {
    return { ok: false, reason: "invalid", message: "Nothing to update." };
  }

  const result = getDb()
    .prepare(`UPDATE bookings SET ${sets.join(", ")} WHERE id = ?`)
    .run(...params, id);
  if (result.changes === 0) {
    return { ok: false, reason: "not_found", message: "Booking not found." };
  }
  return { ok: true };
}

// ---------- manager insights ----------

export interface DailyAccountingRow {
  date: string;
  /** Bookings that day, excluding rejected. */
  bookings: number;
  /** Pending + approved guests. */
  guests: number;
  /** Sum of total_price over approved bookings — confirmed revenue. */
  expectedRevenue: number;
  /** Sum of recorded paid amounts (any status). */
  collected: number;
}

export function accountingRows(
  startDate: string,
  endDate: string
): DailyAccountingRow[] {
  const rows = getDb()
    .prepare(
      `SELECT date,
         SUM(CASE WHEN status != 'rejected' THEN 1 ELSE 0 END) AS bookings,
         SUM(CASE WHEN status IN ('pending','approved') THEN guests ELSE 0 END) AS guests,
         SUM(CASE WHEN status = 'approved' THEN total_price ELSE 0 END) AS expectedRevenue,
         COALESCE(SUM(paid_amount), 0) AS collected
       FROM bookings WHERE date >= ? AND date <= ? GROUP BY date`
    )
    .all(startDate, endDate) as DailyAccountingRow[];

  const byDate = new Map(rows.map((r) => [r.date, r]));
  const filled: DailyAccountingRow[] = [];
  for (let d = startDate; d <= endDate; d = addDays(d, 1)) {
    filled.push(
      byDate.get(d) ?? {
        date: d,
        bookings: 0,
        guests: 0,
        expectedRevenue: 0,
        collected: 0,
      }
    );
  }
  return filled;
}

export interface InsightsData {
  /** Past 30 days including today. */
  past: DailyAccountingRow[];
  /** Today plus the next 14 days. */
  upcoming: DailyAccountingRow[];
  statusCounts: { status: BookingStatus; count: number }[];
  heardAbout: { source: string; count: number }[];
}

export function getInsights(): InsightsData {
  const todayStr = today();
  const past = accountingRows(addDays(todayStr, -29), todayStr);
  const upcoming = accountingRows(todayStr, addDays(todayStr, 14));

  const statusCounts = getDb()
    .prepare("SELECT status, COUNT(*) AS count FROM bookings GROUP BY status")
    .all() as { status: BookingStatus; count: number }[];

  const sources = new Map<string, number>();
  const heardRows = getDb()
    .prepare(
      "SELECT heard_about FROM bookings WHERE heard_about IS NOT NULL AND heard_about != ''"
    )
    .all() as { heard_about: string }[];
  for (const row of heardRows) {
    for (const token of row.heard_about.split(", ")) {
      sources.set(token, (sources.get(token) ?? 0) + 1);
    }
  }
  const heardAbout = [...sources.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  return { past, upcoming, statusCounts, heardAbout };
}

// ---------- admin overview ----------

export interface DaySummary {
  date: string;
  booked: number;
  capacity: number;
  remaining: number;
  price: number;
}

/** Occupancy for the next `days` days, starting today. */
export function occupancySummary(days: number): DaySummary[] {
  const capacity = getDailyCapacity();
  const start = today();
  const rows = getDb()
    .prepare(
      `SELECT date, COALESCE(SUM(guests), 0) AS booked FROM bookings
       WHERE date >= ? AND date <= ? AND status IN ('pending', 'approved')
       GROUP BY date`
    )
    .all(start, addDays(start, days - 1)) as { date: string; booked: number }[];

  const byDate = new Map(rows.map((r) => [r.date, r.booked]));
  const summary: DaySummary[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i);
    const booked = byDate.get(date) ?? 0;
    summary.push({
      date,
      booked,
      capacity,
      remaining: Math.max(0, capacity - booked),
      price: priceForDate(date),
    });
  }
  return summary;
}
