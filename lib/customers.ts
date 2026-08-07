// Customer CRM: visit history and spend are aggregated from bookings;
// notes, tags and the VIP flag live in the `customers` table (keyed by
// phone, the stable identifier across a guest's bookings).

import { getDb } from "./db";
import { logAction, type Actor } from "./bookings";

/** Guest statuses that count as a real, completed visit. */
const VISITED = "guest_status = 'checked_in'";
const NO_SHOW = "guest_status = 'cancelled_no_response'";

export interface CustomerBadge {
  /** Non-rejected bookings this phone has ever made. */
  count: number;
  vip: boolean;
}

/** Badge data (returning / VIP) for a set of phones, in one pass. */
export function customerBadges(phones: string[]): Record<string, CustomerBadge> {
  const out: Record<string, CustomerBadge> = {};
  const unique = [...new Set(phones.filter(Boolean))];
  if (unique.length === 0) return out;

  const db = getDb();
  const placeholders = unique.map(() => "?").join(",");
  const counts = db
    .prepare(
      `SELECT phone, COUNT(*) AS count FROM bookings
       WHERE status != 'rejected' AND phone IN (${placeholders})
       GROUP BY phone`
    )
    .all(...unique) as { phone: string; count: number }[];
  const vips = db
    .prepare(
      `SELECT phone FROM customers WHERE vip = 1 AND phone IN (${placeholders})`
    )
    .all(...unique) as { phone: string }[];

  for (const p of unique) out[p] = { count: 0, vip: false };
  for (const c of counts) if (out[c.phone]) out[c.phone].count = c.count;
  for (const v of vips) if (out[v.phone]) out[v.phone].vip = true;
  return out;
}

export interface CustomerSummary {
  phone: string;
  name: string;
  bookings: number;
  visits: number;
  totalSpent: number;
  lastSeen: string | null;
  vip: boolean;
}

/** All customers, ranked by number of bookings (most first). */
export function listCustomers(limit = 2000): CustomerSummary[] {
  const rows = getDb()
    .prepare(
      `SELECT g.phone AS phone, lb.name AS name,
              g.bookings AS bookings, g.visits AS visits,
              g.totalSpent AS totalSpent, g.lastSeen AS lastSeen,
              COALESCE(c.vip, 0) AS vip
       FROM (
         SELECT phone,
           COALESCE(SUM(CASE WHEN status != 'rejected' THEN 1 ELSE 0 END), 0) AS bookings,
           COALESCE(SUM(CASE WHEN ${VISITED} THEN 1 ELSE 0 END), 0) AS visits,
           COALESCE(SUM(paid_amount), 0) AS totalSpent,
           MAX(date) AS lastSeen,
           MAX(id) AS lastId
         FROM bookings GROUP BY phone
       ) g
       JOIN bookings lb ON lb.id = g.lastId
       LEFT JOIN customers c ON c.phone = g.phone
       ORDER BY g.bookings DESC, g.totalSpent DESC, g.lastSeen DESC
       LIMIT ?`
    )
    .all(limit) as (Omit<CustomerSummary, "vip"> & { vip: number })[];
  return rows.map((r) => ({ ...r, vip: r.vip === 1 }));
}

export interface CustomerVisit {
  id: number;
  date: string;
  guests: number;
  status: string;
  guest_status: string;
  checked_in_count: number;
  paid_amount: number | null;
  total_price: number;
}

export interface CustomerProfile {
  phone: string;
  name: string;
  email: string | null;
  firstSeen: string | null;
  lastSeen: string | null;
  totalBookings: number;
  visits: number;
  noShows: number;
  totalSpent: number;
  vip: boolean;
  notes: string | null;
  tags: string[];
  history: CustomerVisit[];
}

export function getCustomerProfile(phone: string): CustomerProfile | null {
  const db = getDb();
  const history = db
    .prepare(
      `SELECT id, name, email, date, guests, status, guest_status,
              checked_in_count, paid_amount, total_price
       FROM bookings WHERE phone = ? ORDER BY date DESC, id DESC`
    )
    .all(phone) as (CustomerVisit & { name: string; email: string | null })[];
  if (history.length === 0) return null;

  const totals = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN status != 'rejected' THEN 1 ELSE 0 END), 0) AS totalBookings,
         COALESCE(SUM(CASE WHEN ${VISITED} THEN 1 ELSE 0 END), 0) AS visits,
         COALESCE(SUM(CASE WHEN ${NO_SHOW} THEN 1 ELSE 0 END), 0) AS noShows,
         COALESCE(SUM(paid_amount), 0) AS totalSpent,
         MIN(date) AS firstSeen, MAX(date) AS lastSeen
       FROM bookings WHERE phone = ?`
    )
    .get(phone) as {
    totalBookings: number;
    visits: number;
    noShows: number;
    totalSpent: number;
    firstSeen: string | null;
    lastSeen: string | null;
  };

  const extra = db
    .prepare("SELECT notes, tags, vip FROM customers WHERE phone = ?")
    .get(phone) as { notes: string | null; tags: string | null; vip: number } | undefined;

  let tags: string[] = [];
  if (extra?.tags) {
    try {
      const parsed = JSON.parse(extra.tags);
      if (Array.isArray(parsed)) tags = parsed.filter((t) => typeof t === "string");
    } catch {
      tags = [];
    }
  }

  return {
    phone,
    name: history[0].name,
    email: history[0].email,
    firstSeen: totals.firstSeen,
    lastSeen: totals.lastSeen,
    totalBookings: totals.totalBookings,
    visits: totals.visits,
    noShows: totals.noShows,
    totalSpent: totals.totalSpent,
    vip: extra?.vip === 1,
    notes: extra?.notes ?? null,
    tags,
    history: history.map((h) => ({
      id: h.id,
      date: h.date,
      guests: h.guests,
      status: h.status,
      guest_status: h.guest_status,
      checked_in_count: h.checked_in_count,
      paid_amount: h.paid_amount,
      total_price: h.total_price,
    })),
  };
}

export interface CustomerUpdate {
  notes?: string | null;
  tags?: string[];
  vip?: boolean;
}

export type CustomerUpdateResult =
  | { ok: true }
  | { ok: false; message: string };

export function updateCustomer(
  phone: string,
  update: CustomerUpdate,
  actor: Actor
): CustomerUpdateResult {
  const profile = getCustomerProfile(phone);
  if (!profile) return { ok: false, message: "No customer with that phone." };

  if (update.notes !== undefined && update.notes !== null && update.notes.length > 1000) {
    return { ok: false, message: "Notes are too long (1000 characters max)." };
  }
  const tags =
    update.tags !== undefined
      ? [...new Set(update.tags.map((t) => t.trim()).filter(Boolean))].slice(0, 20)
      : undefined;

  const db = getDb();
  // Read current row so we only write the fields being changed.
  const current = db
    .prepare("SELECT notes, tags, vip FROM customers WHERE phone = ?")
    .get(phone) as { notes: string | null; tags: string | null; vip: number } | undefined;

  const nextNotes = update.notes !== undefined ? (update.notes?.trim() || null) : current?.notes ?? null;
  const nextTags = tags !== undefined ? JSON.stringify(tags) : current?.tags ?? null;
  const nextVip = update.vip !== undefined ? (update.vip ? 1 : 0) : current?.vip ?? 0;

  db.prepare(
    `INSERT INTO customers (phone, notes, tags, vip, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(phone) DO UPDATE SET
       notes = excluded.notes, tags = excluded.tags, vip = excluded.vip,
       updated_at = excluded.updated_at`
  ).run(phone, nextNotes, nextTags, nextVip);

  const changes: string[] = [];
  if (update.vip !== undefined && (current?.vip ?? 0) !== nextVip) {
    changes.push(nextVip ? "marked VIP" : "removed VIP");
  }
  if (update.notes !== undefined && (current?.notes ?? null) !== nextNotes) {
    changes.push("notes updated");
  }
  if (tags !== undefined && (current?.tags ?? null) !== nextTags) {
    changes.push("tags updated");
  }
  if (changes.length > 0) {
    logAction(actor, "customer", `${profile.name} (${phone}): ${changes.join(", ")}`);
  }
  return { ok: true };
}
