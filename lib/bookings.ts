import { getDb } from "./db";
import {
  DEFAULT_DAILY_CAPACITY,
  GUEST_PAYMENT_METHODS,
  GUEST_STATUSES,
  HEARD_ABOUT_OPTIONS,
  MAX_ADVANCE_DAYS,
  NO_RESPONSE_CANCEL_HOURS,
  PAYMENT_ACCOUNTS,
  type GuestStatus,
} from "./config";

export type { GuestStatus };
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
  paid_account: string | null;
  payment_method: string | null;
  heard_about: string | null;
  guest_status: GuestStatus;
  guest_status_at: string | null;
  checked_in_at: string | null;
  /** How many of the party actually arrived (0 = none yet). */
  checked_in_count: number;
  notes: string | null;
  created_at: string;
}

/** Guest statuses that release the booking's spots back to the day. */
const RELEASING_GUEST_STATUSES = "('cancelled', 'cancelled_no_response')";

// ---------- audit log (append-only, by design never updated/deleted) ----------

export interface Actor {
  name: string;
  role: string;
}

export interface AuditEntry {
  id: number;
  booking_id: number | null;
  actor_name: string;
  actor_role: string;
  action: string;
  details: string;
  created_at: string;
}

export function logAction(
  actor: Actor,
  action: string,
  details: string,
  bookingId?: number
): void {
  getDb()
    .prepare(
      `INSERT INTO audit_log (booking_id, actor_name, actor_role, action, details)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(bookingId ?? null, actor.name, actor.role, action, details);
}

export function recentActivity(limit = 100): AuditEntry[] {
  return getDb()
    .prepare("SELECT * FROM audit_log ORDER BY id DESC LIMIT ?")
    .all(limit) as AuditEntry[];
}

export interface NewBookingInput {
  name: string;
  phone: string;
  email?: string;
  date: string;
  guests: number;
  heardAbout?: string[];
  paymentMethod?: string;
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

export function setDailyCapacity(capacity: number, actor: Actor): void {
  if (!Number.isInteger(capacity) || capacity < 0) {
    throw new Error("Capacity must be a non-negative whole number.");
  }
  const previous = getDailyCapacity();
  getDb()
    .prepare(
      `INSERT INTO settings (key, value) VALUES ('daily_capacity', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    )
    .run(String(capacity));
  if (previous !== capacity) {
    logAction(actor, "capacity", `Daily capacity: ${previous} → ${capacity}`);
  }
}

// ---------- today's front-desk stats ----------

/** Live bookings for today (excludes rejected and cancelled ones). */
export function bookingsTodayCount(): number {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS n FROM bookings
       WHERE date = ? AND status != 'rejected'
         AND guest_status NOT IN ${RELEASING_GUEST_STATUSES}`
    )
    .get(today()) as { n: number };
  return row.n;
}

/** Guests actually through the gate today (partial arrivals counted). */
export function checkedInGuestsToday(): number {
  const row = getDb()
    .prepare(
      `SELECT COALESCE(SUM(checked_in_count), 0) AS total FROM bookings
       WHERE date = ? AND guest_status NOT IN ${RELEASING_GUEST_STATUSES}`
    )
    .get(today()) as { total: number };
  return row.total;
}

// ---------- availability ----------

/**
 * Guests counted against capacity: pending + approved bookings whose guest
 * hasn't cancelled.
 */
export function bookedGuestsOn(date: string): number {
  const row = getDb()
    .prepare(
      `SELECT COALESCE(SUM(guests), 0) AS total FROM bookings
       WHERE date = ? AND status IN ('pending', 'approved')
         AND guest_status NOT IN ${RELEASING_GUEST_STATUSES}`
    )
    .get(date) as { total: number };
  return row.total;
}

/**
 * Auto-cancel bookings left at "No response" for more than
 * NO_RESPONSE_CANCEL_HOURS. Cheap and idempotent — called from the pages
 * and endpoints that read booking data.
 */
export function sweepNoResponse(): void {
  const db = getDb();
  const stale = db
    .prepare(
      `SELECT id, name, date FROM bookings
       WHERE guest_status = 'no_response' AND guest_status_at IS NOT NULL
         AND guest_status_at <= datetime('now', ?)`
    )
    .all(`-${NO_RESPONSE_CANCEL_HOURS} hours`) as {
    id: number;
    name: string;
    date: string;
  }[];
  if (stale.length === 0) return;

  const cancel = db.prepare(
    `UPDATE bookings SET guest_status = 'cancelled_no_response',
       guest_status_at = datetime('now') WHERE id = ?`
  );
  const run = db.transaction(() => {
    for (const b of stale) {
      cancel.run(b.id);
      logAction(
        { name: "System", role: "system" },
        "guest_status",
        `Booking #${b.id} (${b.name}, ${b.date}): auto-cancelled after ${NO_RESPONSE_CANCEL_HOURS}h with no response`,
        b.id
      );
    }
  });
  run();
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
  // Guests no longer choose a payment method; staff record the account
  // when money is collected. Accepted if sent (older clients), else null.
  const paymentMethod =
    typeof input.paymentMethod === "string" &&
    (GUEST_PAYMENT_METHODS as readonly string[]).includes(input.paymentMethod)
      ? input.paymentMethod
      : null;
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

  sweepNoResponse();
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
        `INSERT INTO bookings (name, phone, email, date, guests, price_per_guest, total_price, payment_method, heard_about, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(name, phone, email, date, guests, pricePerGuest, pricePerGuest * guests, paymentMethod, heardAbout, notes);

    const booking = getBooking(Number(result.lastInsertRowid));
    if (!booking) return { ok: false, error: "Something went wrong. Please try again." };
    return { ok: true, booking };
  });

  return insert();
}

export interface ManualBookingInput {
  name: string;
  phone: string;
  email?: string;
  date: string;
  guests: number;
  notes?: string;
}

/**
 * Staff-entered booking (walk-in or phone booking). Created already
 * approved with the guest marked "confirmed" — staff spoke to the guest
 * themselves. Email is optional here, unlike the public form.
 */
export function createManualBooking(
  input: ManualBookingInput,
  actor: Actor
): CreateResult {
  const name = input.name?.trim() ?? "";
  const phone = input.phone?.trim() ?? "";
  const email = input.email?.trim() || null;
  const notes = input.notes?.trim() || null;
  const date = input.date?.trim() ?? "";
  const guests = input.guests;

  if (name.length < 2 || name.length > 100) {
    return { ok: false, error: "Please enter the guest's full name." };
  }
  if (phone.length < 6 || phone.length > 30) {
    return { ok: false, error: "Please enter a valid phone number." };
  }
  if (email && (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return { ok: false, error: "Please enter a valid email address (or leave it empty)." };
  }
  if (notes && notes.length > 500) {
    return { ok: false, error: "Notes are too long (500 characters max)." };
  }
  if (!isValidDateString(date)) {
    return { ok: false, error: "Please choose a valid date." };
  }
  const todayStr = today();
  if (date < todayStr) {
    return { ok: false, error: "That date has already passed — pick today or a future day." };
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

  sweepNoResponse();
  const db = getDb();
  const insert = db.transaction((): CreateResult => {
    const remaining = remainingOn(date);
    if (guests > remaining) {
      return {
        ok: false,
        error:
          remaining <= 0
            ? "This day is fully booked."
            : `Only ${remaining} ${remaining === 1 ? "spot is" : "spots are"} left on this day.`,
      };
    }

    const pricePerGuest = priceForDate(date);
    const result = db
      .prepare(
        `INSERT INTO bookings (name, phone, email, date, guests, price_per_guest, total_price,
           status, guest_status, guest_status_at, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', 'confirmed', datetime('now'), ?)`
      )
      .run(name, phone, email, date, guests, pricePerGuest, pricePerGuest * guests, notes);

    const id = Number(result.lastInsertRowid);
    logAction(
      actor,
      "created",
      `Booking #${id} (${name}, ${date}, ${guests} ${guests === 1 ? "guest" : "guests"}) added manually from the dashboard`,
      id
    );
    const booking = getBooking(id);
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
  guestStatus?: GuestStatus;
  date?: string;
  includePast?: boolean;
  /** Case-insensitive match against guest name or phone number. */
  query?: string;
}

export function listBookings(filters: BookingFilters = {}): Booking[] {
  const where: string[] = [];
  const params: (string | number)[] = [];

  if (filters.status) {
    where.push("status = ?");
    params.push(filters.status);
  }
  if (filters.guestStatus) {
    where.push("guest_status = ?");
    params.push(filters.guestStatus);
  }
  if (filters.date) {
    where.push("date = ?");
    params.push(filters.date);
  } else if (!filters.includePast && !filters.query) {
    where.push("date >= ?");
    params.push(today());
  }
  if (filters.query) {
    const like = `%${filters.query.replace(/[%_]/g, "")}%`;
    where.push("(name LIKE ? OR phone LIKE ? OR email LIKE ?)");
    params.push(like, like, like);
  }

  // Fully-arrived parties sink to the bottom — the list leads with
  // bookings that still need attention.
  const sql = `
    SELECT * FROM bookings
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY (status = 'approved' AND checked_in_count >= guests) ASC,
      date ASC, created_at ASC
  `;
  return getDb().prepare(sql).all(...params) as Booking[];
}

export interface BookingDetailsUpdate {
  name?: string;
  phone?: string;
  /** null clears the email. */
  email?: string | null;
  date?: string;
  guests?: number;
  notes?: string | null;
  heardAbout?: string | null;
}

export type DetailsUpdateResult =
  | { ok: true; changed: boolean }
  | { ok: false; reason: "not_found" | "invalid" | "capacity"; message: string };

/**
 * Edit any booking detail. Moving the booking to another day (or growing
 * the group) re-checks capacity, and the price is recalculated from the
 * new day. Every real change is written to the audit log.
 */
export function updateBookingDetails(
  id: number,
  u: BookingDetailsUpdate,
  actor: Actor
): DetailsUpdateResult {
  const invalid = (message: string): DetailsUpdateResult => ({
    ok: false,
    reason: "invalid",
    message,
  });

  if (u.name !== undefined && (u.name.trim().length < 2 || u.name.trim().length > 100)) {
    return invalid("Please enter the guest's full name.");
  }
  if (u.phone !== undefined && (u.phone.trim().length < 6 || u.phone.trim().length > 30)) {
    return invalid("Please enter a valid phone number.");
  }
  if (u.email !== undefined && u.email !== null) {
    const email = u.email.trim();
    if (email && (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      return invalid("Please enter a valid email address (or leave it empty).");
    }
  }
  if (u.date !== undefined) {
    if (!isValidDateString(u.date)) return invalid("Please choose a valid date.");
    if (u.date > addDays(today(), MAX_ADVANCE_DAYS)) {
      return invalid(`Bookings open up to ${MAX_ADVANCE_DAYS} days in advance.`);
    }
  }
  if (u.guests !== undefined && (!Number.isInteger(u.guests) || u.guests < 1)) {
    return invalid("Guests must be a whole number of 1 or more.");
  }
  if (u.notes !== undefined && u.notes !== null && u.notes.length > 500) {
    return invalid("Notes are too long (500 characters max).");
  }

  const db = getDb();
  const update = db.transaction((): DetailsUpdateResult => {
    const booking = getBooking(id);
    if (!booking) {
      return { ok: false, reason: "not_found", message: "Booking not found." };
    }

    const name = u.name !== undefined ? u.name.trim() : booking.name;
    const phone = u.phone !== undefined ? u.phone.trim() : booking.phone;
    const email =
      u.email !== undefined ? (u.email?.trim() || null) : booking.email;
    const date = u.date ?? booking.date;
    const guests = u.guests ?? booking.guests;
    const notes =
      u.notes !== undefined ? (u.notes?.trim() || null) : booking.notes;
    const heardAbout =
      u.heardAbout !== undefined
        ? (u.heardAbout?.trim().slice(0, 200) || null)
        : booking.heard_about;

    // Moving day or growing the group takes spots — re-check capacity for
    // bookings that count against it, on today or future days only.
    const counts =
      (booking.status === "pending" || booking.status === "approved") &&
      booking.guest_status !== "cancelled" &&
      booking.guest_status !== "cancelled_no_response";
    if (counts && (date !== booking.date || guests > booking.guests) && date >= today()) {
      const room =
        date === booking.date
          ? remainingOn(date) + booking.guests // this booking already counted
          : remainingOn(date);
      if (guests > room) {
        return {
          ok: false,
          reason: "capacity",
          message: `Not enough space on ${date}: this booking needs ${guests} ${guests === 1 ? "spot" : "spots"} but only ${Math.max(0, room)} ${room === 1 ? "is" : "are"} left.`,
        };
      }
    }
    if (guests < booking.checked_in_count) {
      return invalid(
        `${booking.checked_in_count} guests have already checked in — the group can't be smaller than that.`
      );
    }

    const pricePerGuest =
      date !== booking.date ? priceForDate(date) : booking.price_per_guest;
    const totalPrice = pricePerGuest * guests;

    const changes: string[] = [];
    if (name !== booking.name) changes.push(`name ${booking.name} → ${name}`);
    if (phone !== booking.phone) changes.push(`phone ${booking.phone} → ${phone}`);
    if (email !== booking.email)
      changes.push(`email ${booking.email ?? "—"} → ${email ?? "—"}`);
    if (date !== booking.date) changes.push(`day ${booking.date} → ${date}`);
    if (guests !== booking.guests)
      changes.push(`guests ${booking.guests} → ${guests}`);
    if (totalPrice !== booking.total_price)
      changes.push(`total ${booking.total_price} → ${totalPrice} JOD`);
    if (notes !== booking.notes) changes.push("notes updated");
    if (heardAbout !== booking.heard_about) changes.push("heard-about updated");
    if (changes.length === 0) return { ok: true, changed: false };

    db.prepare(
      `UPDATE bookings SET name = ?, phone = ?, email = ?, date = ?, guests = ?,
         price_per_guest = ?, total_price = ?, notes = ?, heard_about = ?
       WHERE id = ?`
    ).run(name, phone, email, date, guests, pricePerGuest, totalPrice, notes, heardAbout, id);
    logAction(
      actor,
      "edited",
      `Booking #${id} (${booking.name}, ${booking.date}): ${changes.join(", ")}`,
      id
    );
    return { ok: true, changed: true };
  });
  return update();
}

export type StatusUpdateResult =
  | { ok: true; changed: boolean }
  | { ok: false; reason: "not_found" | "capacity"; message: string };

export function updateBookingStatus(
  id: number,
  status: BookingStatus,
  actor: Actor
): StatusUpdateResult {
  const db = getDb();
  const update = db.transaction((): StatusUpdateResult => {
    const booking = getBooking(id);
    if (!booking) {
      return { ok: false, reason: "not_found", message: "Booking not found." };
    }
    if (booking.status === status) return { ok: true, changed: false };

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
    logAction(
      actor,
      "status",
      `Booking #${id} (${booking.name}, ${booking.date}): ${booking.status} → ${status}`,
      id
    );
    return { ok: true, changed: true };
  });
  return update();
}

export type CheckInResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "invalid"; message: string };

export function updateGuestStatus(
  id: number,
  guestStatus: GuestStatus,
  actor: Actor
): CheckInResult {
  if (
    !GUEST_STATUSES.includes(guestStatus) ||
    guestStatus === "cancelled_no_response" // system-only, via the sweep
  ) {
    return { ok: false, reason: "invalid", message: "Unknown guest status." };
  }
  const db = getDb();
  const update = db.transaction((): CheckInResult => {
    const booking = getBooking(id);
    if (!booking) {
      return { ok: false, reason: "not_found", message: "Booking not found." };
    }
    if (guestStatus === "checked_in" && booking.status !== "approved") {
      return {
        ok: false,
        reason: "invalid",
        message: "Approve the booking before checking guests in.",
      };
    }
    if (booking.guest_status === guestStatus) return { ok: true };

    // checked_in_at and the arrivals count stay in lockstep with the status.
    const checkedInSql =
      guestStatus === "checked_in"
        ? `, checked_in_at = datetime('now'), checked_in_count = CASE WHEN checked_in_count = 0 THEN guests ELSE checked_in_count END`
        : booking.guest_status === "checked_in"
          ? ", checked_in_at = NULL, checked_in_count = 0"
          : "";
    db.prepare(
      `UPDATE bookings SET guest_status = ?, guest_status_at = datetime('now')${checkedInSql} WHERE id = ?`
    ).run(guestStatus, id);
    logAction(
      actor,
      guestStatus === "checked_in" ? "check_in" : "guest_status",
      guestStatus === "checked_in"
        ? `Checked in booking #${id} (${booking.name}, ${booking.guests} guests, ${booking.date})`
        : `Booking #${id} (${booking.name}, ${booking.date}): guest status ${booking.guest_status} → ${guestStatus}`,
      id
    );
    return { ok: true };
  });
  return update();
}

export function setCheckedIn(
  id: number,
  checkedIn: boolean,
  actor: Actor
): CheckInResult {
  if (!checkedIn) return updateGuestStatus(id, "confirmed", actor);
  return updateGuestStatus(id, "checked_in", actor);
}

/**
 * Record how many of the party have actually arrived (partial check-in).
 * 0 clears the check-in; reaching any positive count marks the booking
 * checked in.
 */
export function setCheckedInCount(
  id: number,
  count: number,
  actor: Actor
): CheckInResult {
  if (!Number.isInteger(count) || count < 0) {
    return { ok: false, reason: "invalid", message: "Invalid arrivals count." };
  }
  const db = getDb();
  const update = db.transaction((): CheckInResult => {
    const booking = getBooking(id);
    if (!booking) {
      return { ok: false, reason: "not_found", message: "Booking not found." };
    }
    if (count > booking.guests) {
      return {
        ok: false,
        reason: "invalid",
        message: `This booking has ${booking.guests} guests — the arrivals count can't exceed that.`,
      };
    }
    if (count > 0 && booking.status !== "approved") {
      return {
        ok: false,
        reason: "invalid",
        message: "Approve the booking before checking guests in.",
      };
    }
    if (count === booking.checked_in_count) return { ok: true };

    if (count > 0) {
      db.prepare(
        `UPDATE bookings SET checked_in_count = ?, guest_status = 'checked_in',
           guest_status_at = datetime('now'),
           checked_in_at = COALESCE(checked_in_at, datetime('now'))
         WHERE id = ?`
      ).run(count, id);
    } else {
      db.prepare(
        `UPDATE bookings SET checked_in_count = 0, checked_in_at = NULL,
           guest_status = CASE WHEN guest_status = 'checked_in' THEN 'confirmed' ELSE guest_status END,
           guest_status_at = datetime('now')
         WHERE id = ?`
      ).run(id);
    }
    logAction(
      actor,
      "check_in",
      count > 0
        ? `Booking #${id} (${booking.name}, ${booking.date}): ${count} of ${booking.guests} guests checked in`
        : `Booking #${id} (${booking.name}, ${booking.date}): arrivals cleared (was ${booking.checked_in_count} of ${booking.guests})`,
      id
    );
    return { ok: true };
  });
  return update();
}

export interface PaymentUpdate {
  rateType?: RateType;
  /** Amount actually collected, in JOD. Pass null to clear it. */
  paidAmount?: number | null;
  /** Which account the money was recorded under (Cash / CliQ / Visa). */
  paidAccount?: string | null;
}

export type PaymentUpdateResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "invalid"; message: string };

export function updateBookingPayment(
  id: number,
  update: PaymentUpdate,
  actor: Actor
): PaymentUpdateResult {
  const sets: string[] = [];
  const params: (string | number | null)[] = [];
  const described: string[] = [];

  if (update.rateType !== undefined) {
    if (!RATE_TYPES.includes(update.rateType)) {
      return { ok: false, reason: "invalid", message: "Unknown rate type." };
    }
    sets.push("rate_type = ?");
    params.push(update.rateType);
    described.push(`rate ${update.rateType}`);
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
    described.push(
      update.paidAmount === null ? "paid cleared" : `paid ${update.paidAmount} JOD`
    );
  }
  if (update.paidAccount !== undefined) {
    if (
      update.paidAccount !== null &&
      !(PAYMENT_ACCOUNTS as readonly string[]).includes(update.paidAccount)
    ) {
      return {
        ok: false,
        reason: "invalid",
        message: `Account must be one of: ${PAYMENT_ACCOUNTS.join(", ")}.`,
      };
    }
    sets.push("paid_account = ?");
    params.push(update.paidAccount);
    if (update.paidAccount) described.push(`account ${update.paidAccount}`);
  }
  if (sets.length === 0) {
    return { ok: false, reason: "invalid", message: "Nothing to update." };
  }

  const booking = getBooking(id);
  if (!booking) {
    return { ok: false, reason: "not_found", message: "Booking not found." };
  }
  getDb()
    .prepare(`UPDATE bookings SET ${sets.join(", ")} WHERE id = ?`)
    .run(...params, id);
  logAction(
    actor,
    "payment",
    `Booking #${id} (${booking.name}, ${booking.date}): ${described.join(", ")}`,
    id
  );
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
  /** Collected, split by account (Cash / CliQ / Visa). */
  byAccount: Record<string, number>;
}

export function accountingRows(
  startDate: string,
  endDate: string
): DailyAccountingRow[] {
  const rows = getDb()
    .prepare(
      `SELECT date,
         SUM(CASE WHEN status != 'rejected' THEN 1 ELSE 0 END) AS bookings,
         SUM(CASE WHEN status IN ('pending','approved')
                   AND guest_status NOT IN ${RELEASING_GUEST_STATUSES}
             THEN guests ELSE 0 END) AS guests,
         SUM(CASE WHEN status = 'approved'
                   AND guest_status NOT IN ${RELEASING_GUEST_STATUSES}
             THEN total_price ELSE 0 END) AS expectedRevenue,
         COALESCE(SUM(paid_amount), 0) AS collected
       FROM bookings WHERE date >= ? AND date <= ? GROUP BY date`
    )
    .all(startDate, endDate) as Omit<DailyAccountingRow, "byAccount">[];

  const accountRows = getDb()
    .prepare(
      `SELECT date, paid_account, COALESCE(SUM(paid_amount), 0) AS total
       FROM bookings
       WHERE date >= ? AND date <= ? AND paid_amount IS NOT NULL AND paid_account IS NOT NULL
       GROUP BY date, paid_account`
    )
    .all(startDate, endDate) as { date: string; paid_account: string; total: number }[];

  const emptyAccounts = (): Record<string, number> =>
    Object.fromEntries(PAYMENT_ACCOUNTS.map((a) => [a, 0]));

  const accountsByDate = new Map<string, Record<string, number>>();
  for (const r of accountRows) {
    const bucket = accountsByDate.get(r.date) ?? emptyAccounts();
    if (r.paid_account in bucket) bucket[r.paid_account] += r.total;
    accountsByDate.set(r.date, bucket);
  }

  const byDate = new Map(rows.map((r) => [r.date, r]));
  const filled: DailyAccountingRow[] = [];
  for (let d = startDate; d <= endDate; d = addDays(d, 1)) {
    const base = byDate.get(d) ?? {
      date: d,
      bookings: 0,
      guests: 0,
      expectedRevenue: 0,
      collected: 0,
    };
    filled.push({ ...base, byAccount: accountsByDate.get(d) ?? emptyAccounts() });
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
  /** Distinct guests (by phone) and how many of them booked more than once. */
  returning: { totalGuests: number; repeatGuests: number; rate: number };
  /** Website page views over the last 30 days. */
  views30: number;
  /** "Book" button clicks by page section, last 30 days. */
  bookClicks: { source: string; count: number }[];
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

  const repeat = getDb()
    .prepare(
      `SELECT COUNT(*) AS totalGuests,
              COALESCE(SUM(CASE WHEN cnt > 1 THEN 1 ELSE 0 END), 0) AS repeatGuests
       FROM (SELECT phone, COUNT(*) AS cnt FROM bookings
             WHERE status != 'rejected' GROUP BY phone)`
    )
    .get() as { totalGuests: number; repeatGuests: number };
  const returning = {
    ...repeat,
    rate:
      repeat.totalGuests > 0
        ? Math.round((repeat.repeatGuests / repeat.totalGuests) * 100)
        : 0,
  };

  return {
    past,
    upcoming,
    statusCounts,
    heardAbout,
    returning,
    views30: eventCount30d("page_view"),
    bookClicks: bookClicksBySource30d(),
  };
}

// ---------- first-party analytics ----------

export const EVENT_TYPES = ["page_view", "book_click"] as const;

export function recordEvent(type: string, meta: string | null): void {
  if (!(EVENT_TYPES as readonly string[]).includes(type)) return;
  getDb()
    .prepare("INSERT INTO events (type, meta) VALUES (?, ?)")
    .run(type, meta ? meta.slice(0, 60) : null);
}

function eventCount30d(type: string): number {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS n FROM events
       WHERE type = ? AND created_at >= datetime('now', '-30 days')`
    )
    .get(type) as { n: number };
  return row.n;
}

function bookClicksBySource30d(): { source: string; count: number }[] {
  return getDb()
    .prepare(
      `SELECT COALESCE(meta, 'unknown') AS source, COUNT(*) AS count
       FROM events
       WHERE type = 'book_click' AND created_at >= datetime('now', '-30 days')
       GROUP BY source ORDER BY count DESC`
    )
    .all() as { source: string; count: number }[];
}

// ---------- guest journey reports (for partners) ----------

export interface JourneyRow {
  period: string;
  total: number;
  rejected: number;
  counts: Record<GuestStatus, number>;
  checkedInGuests: number;
}

/**
 * Bookings per period (by visit date) broken down by guest status.
 * unit: "day" | "week" | "month".
 */
export function guestJourney(
  unit: "day" | "week" | "month",
  periods: number
): JourneyRow[] {
  const todayStr = today();
  const start =
    unit === "day"
      ? addDays(todayStr, -(periods - 1))
      : unit === "week"
        ? addDays(todayStr, -(periods * 7 - 1))
        : `${todayStr.slice(0, 7)}-01`.replace(
            /^(\d{4})-(\d{2})/,
            (_, y, m) => {
              const total = Number(y) * 12 + (Number(m) - 1) - (periods - 1);
              const yy = Math.floor(total / 12);
              const mm = total - yy * 12 + 1;
              return `${yy}-${String(mm).padStart(2, "0")}`;
            }
          );

  const expr =
    unit === "day"
      ? "date"
      : unit === "week"
        ? "strftime('%Y-W%W', date)"
        : "strftime('%Y-%m', date)";

  const statusSums = GUEST_STATUSES.map(
    (s) => `SUM(guest_status = '${s}') AS "${s}"`
  ).join(", ");

  const rows = getDb()
    .prepare(
      `SELECT ${expr} AS period,
         COUNT(*) AS total,
         SUM(status = 'rejected') AS rejected,
         ${statusSums},
         COALESCE(SUM(checked_in_count), 0) AS checkedInGuests
       FROM bookings WHERE date >= ? AND date <= ?
       GROUP BY period ORDER BY period DESC`
    )
    .all(start, todayStr) as (Record<string, number> & { period: string })[];

  return rows.map((r) => ({
    period: String(r.period),
    total: r.total,
    rejected: r.rejected,
    counts: Object.fromEntries(
      GUEST_STATUSES.map((s) => [s, r[s] ?? 0])
    ) as Record<GuestStatus, number>,
    checkedInGuests: r.checkedInGuests,
  }));
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
         AND guest_status NOT IN ${RELEASING_GUEST_STATUSES}
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
