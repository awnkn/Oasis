// Dates the club is closed for bookings. When a date is closed, neither a
// day nor a night booking may be made for it, and the availability API
// reports it as closed so the booking form and dashboard reflect it.

import { getDb } from "./db";
import { logAction, type Actor } from "./bookings";
import { isValidDateString, today } from "./dates";

export interface ClosedDate {
  date: string;
  reason: string | null;
  actor_name: string;
  created_at: string;
}

/** Upcoming closures (today onward), soonest first — the useful admin view. */
export function listClosedDates(): ClosedDate[] {
  return getDb()
    .prepare(
      `SELECT date, reason, actor_name, created_at
       FROM closed_dates WHERE date >= ? ORDER BY date ASC`
    )
    .all(today()) as ClosedDate[];
}

export function isDateClosed(date: string): boolean {
  const row = getDb()
    .prepare("SELECT 1 AS x FROM closed_dates WHERE date = ?")
    .get(date);
  return Boolean(row);
}

/** The subset of [start, end] that is closed, as a fast lookup set. */
export function closedDatesInRange(start: string, end: string): Set<string> {
  const rows = getDb()
    .prepare("SELECT date FROM closed_dates WHERE date >= ? AND date <= ?")
    .all(start, end) as { date: string }[];
  return new Set(rows.map((r) => r.date));
}

export type CloseResult = { ok: true } | { ok: false; error: string };

export function addClosedDate(
  date: string,
  reason: string | null | undefined,
  actor: Actor
): CloseResult {
  const d = (date ?? "").trim();
  if (!isValidDateString(d)) {
    return { ok: false, error: "Please choose a valid date." };
  }
  if (d < today()) {
    return { ok: false, error: "That date has already passed." };
  }
  const r = reason?.trim() ? reason.trim().slice(0, 200) : null;
  getDb()
    .prepare(
      `INSERT INTO closed_dates (date, reason, actor_name, actor_role)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET reason = excluded.reason`
    )
    .run(d, r, actor.name, actor.role);
  logAction(actor, "closure", `Closed ${d} for bookings${r ? ` — ${r}` : ""}`);
  return { ok: true };
}

export function removeClosedDate(date: string, actor: Actor): boolean {
  const info = getDb()
    .prepare("DELETE FROM closed_dates WHERE date = ?")
    .run(date);
  if (info.changes > 0) {
    logAction(actor, "closure", `Reopened ${date} for bookings`);
    return true;
  }
  return false;
}
