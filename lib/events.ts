// Ticketed events / activities — a generic layer so any number of events
// can be created, edited and sold from the admin dashboard, entirely
// separate from the daily pool pass.

import { getDb } from "./db";
import { logAction, type Actor } from "./bookings";
import { isValidDateString, today } from "./dates";

export interface TicketedEvent {
  id: number;
  slug: string;
  title: string;
  tagline: string | null;
  description: string | null;
  /** Parsed bullet list ("What's waiting for you"). */
  highlights: string[];
  event_date: string | null;
  start_time: string | null;
  price: number;
  price_note: string | null;
  capacity: number | null;
  location: string | null;
  hero_updated_at: string | null;
  active: number;
  sort_order: number;
  created_at: string;
}

interface EventRow extends Omit<TicketedEvent, "highlights"> {
  highlights: string | null;
}

export type EventTicketStatus = "pending" | "approved" | "rejected";
export const EVENT_TICKET_STATUSES: EventTicketStatus[] = [
  "pending",
  "approved",
  "rejected",
];

// Guest statuses for event tickets (no 24h auto-cancel sweep here).
export const EVENT_GUEST_STATUSES = [
  "open",
  "contacted",
  "confirmed",
  "checked_in",
  "cancelled",
] as const;
export type EventGuestStatus = (typeof EVENT_GUEST_STATUSES)[number];

export interface EventTicket {
  id: number;
  event_id: number;
  name: string;
  phone: string;
  email: string | null;
  quantity: number;
  total_price: number;
  status: EventTicketStatus;
  guest_status: EventGuestStatus;
  paid_amount: number | null;
  paid_account: string | null;
  checked_in_count: number;
  notes: string | null;
  created_at: string;
}

const RELEASING = "('cancelled')";

function parseRow(row: EventRow | undefined): TicketedEvent | undefined {
  if (!row) return undefined;
  let highlights: string[] = [];
  if (row.highlights) {
    try {
      const parsed = JSON.parse(row.highlights);
      if (Array.isArray(parsed)) highlights = parsed.filter((h) => typeof h === "string");
    } catch {
      highlights = [];
    }
  }
  return { ...row, highlights };
}

// ---------- slugs ----------

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "event";
}

function uniqueSlug(title: string, excludeId?: number): string {
  const db = getDb();
  const base = slugify(title);
  let slug = base;
  let n = 2;
  for (;;) {
    const row = db
      .prepare("SELECT id FROM ticketed_events WHERE slug = ?")
      .get(slug) as { id: number } | undefined;
    if (!row || row.id === excludeId) return slug;
    slug = `${base}-${n++}`;
  }
}

// ---------- reads ----------

export function listEvents(includeInactive = false): TicketedEvent[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM ticketed_events
       ${includeInactive ? "" : "WHERE active = 1"}
       ORDER BY sort_order ASC,
         CASE WHEN event_date IS NULL THEN 1 ELSE 0 END,
         event_date ASC, created_at DESC`
    )
    .all() as EventRow[];
  return rows.map((r) => parseRow(r)!) as TicketedEvent[];
}

/** Active events that haven't already passed — for the public site. */
export function listUpcomingEvents(): TicketedEvent[] {
  const todayStr = today();
  return listEvents(false).filter(
    (e) => !e.event_date || e.event_date >= todayStr
  );
}

export function getEvent(id: number): TicketedEvent | undefined {
  return parseRow(
    getDb().prepare("SELECT * FROM ticketed_events WHERE id = ?").get(id) as
      | EventRow
      | undefined
  );
}

export function getEventBySlug(slug: string): TicketedEvent | undefined {
  return parseRow(
    getDb()
      .prepare("SELECT * FROM ticketed_events WHERE slug = ?")
      .get(slug) as EventRow | undefined
  );
}

// ---------- hero photo ----------

export interface HeroImage {
  data: Buffer;
  content_type: string;
}

export function getEventHero(eventId: number): HeroImage | undefined {
  return getDb()
    .prepare("SELECT data, content_type FROM event_hero WHERE event_id = ?")
    .get(eventId) as HeroImage | undefined;
}

export function setEventHero(
  eventId: number,
  data: Buffer,
  contentType: string,
  actor: Actor
): boolean {
  const db = getDb();
  const event = getEvent(eventId);
  if (!event) return false;
  const run = db.transaction(() => {
    db.prepare(
      `INSERT INTO event_hero (event_id, data, content_type, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(event_id) DO UPDATE SET
         data = excluded.data, content_type = excluded.content_type,
         updated_at = excluded.updated_at`
    ).run(eventId, data, contentType);
    db.prepare(
      "UPDATE ticketed_events SET hero_updated_at = datetime('now') WHERE id = ?"
    ).run(eventId);
  });
  run();
  logAction(actor, "event", `Updated hero photo for event "${event.title}"`);
  return true;
}

// ---------- create / update ----------

export interface EventInput {
  title?: string;
  tagline?: string | null;
  description?: string | null;
  highlights?: string[];
  eventDate?: string | null;
  startTime?: string | null;
  price?: number;
  priceNote?: string | null;
  capacity?: number | null;
  location?: string | null;
  active?: boolean;
}

export type EventResult =
  | { ok: true; event: TicketedEvent }
  | { ok: false; message: string };

function validate(input: EventInput, forCreate: boolean): string | null {
  if (forCreate || input.title !== undefined) {
    const t = (input.title ?? "").trim();
    if (t.length < 2 || t.length > 120) return "Title must be 2–120 characters.";
  }
  if (input.price !== undefined) {
    if (typeof input.price !== "number" || !Number.isFinite(input.price) || input.price < 0 || input.price > 100000) {
      return "Price must be between 0 and 100000.";
    }
  }
  if (input.eventDate !== undefined && input.eventDate !== null && input.eventDate !== "") {
    if (!isValidDateString(input.eventDate)) return "Please choose a valid event date.";
  }
  if (input.capacity !== undefined && input.capacity !== null) {
    if (!Number.isInteger(input.capacity) || input.capacity < 0 || input.capacity > 100000) {
      return "Capacity must be a whole number (leave empty for unlimited).";
    }
  }
  if (input.description && input.description.length > 4000) return "Description is too long.";
  if (input.highlights && input.highlights.length > 20) return "Too many highlights (20 max).";
  return null;
}

export function createEvent(input: EventInput, actor: Actor): EventResult {
  const err = validate(input, true);
  if (err) return { ok: false, message: err };
  const db = getDb();
  const title = input.title!.trim();
  const result = db
    .prepare(
      `INSERT INTO ticketed_events
         (slug, title, tagline, description, highlights, event_date, start_time,
          price, price_note, capacity, location, active)
       VALUES (@slug, @title, @tagline, @description, @highlights, @event_date,
          @start_time, @price, @price_note, @capacity, @location, @active)`
    )
    .run({
      slug: uniqueSlug(title),
      title,
      tagline: input.tagline?.trim() || null,
      description: input.description?.trim() || null,
      highlights: JSON.stringify(
        (input.highlights ?? []).map((h) => h.trim()).filter(Boolean)
      ),
      event_date: input.eventDate?.trim() || null,
      start_time: input.startTime?.trim() || null,
      price: input.price ?? 0,
      price_note: input.priceNote?.trim() || null,
      capacity: input.capacity ?? null,
      location: input.location?.trim() || null,
      active: input.active === false ? 0 : 1,
    });
  const event = getEvent(Number(result.lastInsertRowid))!;
  logAction(actor, "event", `Created event "${event.title}"`);
  return { ok: true, event };
}

export function updateEvent(id: number, input: EventInput, actor: Actor): EventResult {
  const err = validate(input, false);
  if (err) return { ok: false, message: err };
  const existing = getEvent(id);
  if (!existing) return { ok: false, message: "Event not found." };

  const sets: string[] = [];
  const params: Record<string, unknown> = { id };
  const set = (col: string, val: unknown) => {
    sets.push(`${col} = @${col}`);
    params[col] = val;
  };

  if (input.title !== undefined) {
    const title = input.title.trim();
    set("title", title);
    set("slug", uniqueSlug(title, id));
  }
  if (input.tagline !== undefined) set("tagline", input.tagline?.trim() || null);
  if (input.description !== undefined) set("description", input.description?.trim() || null);
  if (input.highlights !== undefined)
    set("highlights", JSON.stringify(input.highlights.map((h) => h.trim()).filter(Boolean)));
  if (input.eventDate !== undefined) set("event_date", input.eventDate?.trim() || null);
  if (input.startTime !== undefined) set("start_time", input.startTime?.trim() || null);
  if (input.price !== undefined) set("price", input.price);
  if (input.priceNote !== undefined) set("price_note", input.priceNote?.trim() || null);
  if (input.capacity !== undefined) set("capacity", input.capacity);
  if (input.location !== undefined) set("location", input.location?.trim() || null);
  if (input.active !== undefined) set("active", input.active ? 1 : 0);

  if (sets.length === 0) return { ok: true, event: existing };
  getDb()
    .prepare(`UPDATE ticketed_events SET ${sets.join(", ")} WHERE id = @id`)
    .run(params);
  const event = getEvent(id)!;
  logAction(actor, "event", `Edited event "${event.title}"`);
  return { ok: true, event };
}

export function deleteEvent(id: number, actor: Actor): boolean {
  const db = getDb();
  const event = getEvent(id);
  if (!event) return false;
  const run = db.transaction(() => {
    db.prepare("DELETE FROM event_hero WHERE event_id = ?").run(id);
    db.prepare("DELETE FROM event_tickets WHERE event_id = ?").run(id);
    db.prepare("DELETE FROM ticketed_events WHERE id = ?").run(id);
  });
  run();
  logAction(actor, "event", `Deleted event "${event.title}" and its reservations`);
  return true;
}

// ---------- capacity ----------

/** Tickets counted against capacity (pending + approved, not cancelled). */
export function ticketsSold(eventId: number): number {
  const row = getDb()
    .prepare(
      `SELECT COALESCE(SUM(quantity), 0) AS n FROM event_tickets
       WHERE event_id = ? AND status IN ('pending', 'approved')
         AND guest_status NOT IN ${RELEASING}`
    )
    .get(eventId) as { n: number };
  return row.n;
}

/** null = unlimited; otherwise remaining spots. */
export function remainingFor(event: TicketedEvent): number | null {
  if (event.capacity === null) return null;
  return Math.max(0, event.capacity - ticketsSold(event.id));
}

// ---------- reservations (public) ----------

export interface NewTicketInput {
  eventId: number;
  name: string;
  phone: string;
  email?: string;
  quantity: number;
  notes?: string;
  termsAccepted?: boolean;
}

export type TicketResult =
  | { ok: true; ticket: EventTicket; event: TicketedEvent }
  | { ok: false; error: string };

export function createTicket(input: NewTicketInput): TicketResult {
  const name = input.name?.trim() ?? "";
  const phone = input.phone?.trim() ?? "";
  const email = input.email?.trim() || null;
  const notes = input.notes?.trim() || null;

  if (name.length < 2 || name.length > 100) return { ok: false, error: "Please enter your full name." };
  if (phone.length < 6 || phone.length > 30) return { ok: false, error: "Please enter a valid phone number." };
  if (!email || email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (notes && notes.length > 500) return { ok: false, error: "Notes are too long (500 characters max)." };
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 30) {
    return { ok: false, error: "Please choose how many tickets you need (1–30)." };
  }
  if (input.termsAccepted !== true) {
    return { ok: false, error: "Please accept the terms to continue." };
  }

  const db = getDb();
  const insert = db.transaction((): TicketResult => {
    const event = getEvent(input.eventId);
    if (!event || !event.active) return { ok: false, error: "This event is no longer available." };
    if (event.event_date && event.event_date < today()) {
      return { ok: false, error: "This event has already passed." };
    }
    const remaining = remainingFor(event);
    if (remaining !== null && input.quantity > remaining) {
      return {
        ok: false,
        error:
          remaining <= 0
            ? "This event is fully booked."
            : `Only ${remaining} ${remaining === 1 ? "ticket is" : "tickets are"} left for this event.`,
      };
    }
    const total = event.price * input.quantity;
    const result = db
      .prepare(
        `INSERT INTO event_tickets (event_id, name, phone, email, quantity, total_price, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(event.id, name, phone, email, input.quantity, total, notes);
    const ticket = getTicket(Number(result.lastInsertRowid))!;
    return { ok: true, ticket, event };
  });
  return insert();
}

// ---------- reservations (admin) ----------

export function getTicket(id: number): EventTicket | undefined {
  return getDb().prepare("SELECT * FROM event_tickets WHERE id = ?").get(id) as
    | EventTicket
    | undefined;
}

export function listTicketsForEvent(eventId: number): EventTicket[] {
  return getDb()
    .prepare(
      `SELECT * FROM event_tickets WHERE event_id = ?
       ORDER BY (status = 'approved' AND checked_in_count >= quantity) ASC,
         CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
         created_at ASC`
    )
    .all(eventId) as EventTicket[];
}

export interface TicketSummary {
  total: number;
  pending: number;
  approved: number;
  guests: number;
  checkedIn: number;
  collected: number;
}

export function ticketSummary(eventId: number): TicketSummary {
  return getDb()
    .prepare(
      `SELECT
         COUNT(*) AS total,
         COALESCE(SUM(status = 'pending'), 0) AS pending,
         COALESCE(SUM(status = 'approved'), 0) AS approved,
         COALESCE(SUM(CASE WHEN status IN ('pending','approved') AND guest_status NOT IN ${RELEASING}
             THEN quantity ELSE 0 END), 0) AS guests,
         COALESCE(SUM(checked_in_count), 0) AS checkedIn,
         COALESCE(SUM(paid_amount), 0) AS collected
       FROM event_tickets WHERE event_id = ?`
    )
    .get(eventId) as TicketSummary;
}

export type TicketUpdateResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "invalid" | "capacity"; message: string };

export interface TicketUpdate {
  status?: EventTicketStatus;
  guestStatus?: EventGuestStatus;
  checkedInCount?: number;
  paidAmount?: number | null;
  paidAccount?: string | null;
}

export function updateTicket(
  id: number,
  u: TicketUpdate,
  actor: Actor,
  accounts: readonly string[]
): TicketUpdateResult {
  const db = getDb();
  const run = db.transaction((): TicketUpdateResult => {
    const ticket = getTicket(id);
    if (!ticket) return { ok: false, reason: "not_found", message: "Reservation not found." };
    const event = getEvent(ticket.event_id);
    const changes: string[] = [];

    if (u.status !== undefined) {
      if (!EVENT_TICKET_STATUSES.includes(u.status)) {
        return { ok: false, reason: "invalid", message: "Unknown status." };
      }
      // Restoring a rejected ticket re-checks capacity.
      if (ticket.status === "rejected" && u.status !== "rejected" && event?.capacity != null) {
        const remaining = remainingFor(event) ?? Infinity;
        if (ticket.quantity > remaining) {
          return { ok: false, reason: "capacity", message: `Only ${remaining} left for this event.` };
        }
      }
      if (u.status !== ticket.status) changes.push(`status ${ticket.status} → ${u.status}`);
      db.prepare("UPDATE event_tickets SET status = ? WHERE id = ?").run(u.status, id);
    }

    if (u.guestStatus !== undefined) {
      if (!EVENT_GUEST_STATUSES.includes(u.guestStatus)) {
        return { ok: false, reason: "invalid", message: "Unknown guest status." };
      }
      if (u.guestStatus !== ticket.guest_status) changes.push(`guest ${ticket.guest_status} → ${u.guestStatus}`);
      db.prepare("UPDATE event_tickets SET guest_status = ? WHERE id = ?").run(u.guestStatus, id);
    }

    if (u.checkedInCount !== undefined) {
      if (!Number.isInteger(u.checkedInCount) || u.checkedInCount < 0 || u.checkedInCount > ticket.quantity) {
        return { ok: false, reason: "invalid", message: `Arrivals must be between 0 and ${ticket.quantity}.` };
      }
      changes.push(`arrivals ${u.checkedInCount} of ${ticket.quantity}`);
      db.prepare(
        `UPDATE event_tickets SET checked_in_count = ?,
           guest_status = CASE WHEN ? > 0 THEN 'checked_in'
             WHEN guest_status = 'checked_in' THEN 'confirmed' ELSE guest_status END
         WHERE id = ?`
      ).run(u.checkedInCount, u.checkedInCount, id);
    }

    if (u.paidAmount !== undefined) {
      if (u.paidAmount !== null && (typeof u.paidAmount !== "number" || u.paidAmount < 0 || u.paidAmount > 100000)) {
        return { ok: false, reason: "invalid", message: "Paid amount must be between 0 and 100000." };
      }
      changes.push(u.paidAmount === null ? "paid cleared" : `paid ${u.paidAmount} JOD`);
      db.prepare("UPDATE event_tickets SET paid_amount = ? WHERE id = ?").run(u.paidAmount, id);
    }
    if (u.paidAccount !== undefined) {
      if (u.paidAccount !== null && !accounts.includes(u.paidAccount)) {
        return { ok: false, reason: "invalid", message: "Unknown payment account." };
      }
      db.prepare("UPDATE event_tickets SET paid_account = ? WHERE id = ?").run(u.paidAccount, id);
    }

    if (changes.length > 0) {
      logAction(
        actor,
        "event_ticket",
        `Event "${event?.title ?? ticket.event_id}" · reservation #${String(id).padStart(4, "0")} (${ticket.name}): ${changes.join(", ")}`
      );
    }
    return { ok: true };
  });
  return run();
}
