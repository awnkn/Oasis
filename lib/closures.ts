// Dates the club is closed for bookings. When a date is closed, neither a
// day nor a night booking may be made for it, and the availability API
// reports it as closed so the booking form and dashboard reflect it.

import { getDb } from "./db";
import { logAction, type Actor } from "./bookings";
import { addDays, isValidDateString, today } from "./dates";

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

/**
 * Close every date in [start, end] inclusive. Single-day closes pass the same
 * date for both. Past days are skipped; the range is capped at 90 days.
 */
export function addClosedDateRange(
  start: string,
  end: string,
  reason: string | null | undefined,
  actor: Actor
): CloseResult {
  const s = (start ?? "").trim();
  const e = (end ?? "").trim();
  if (!isValidDateString(s) || !isValidDateString(e)) {
    return { ok: false, error: "Please choose valid dates." };
  }
  let [from, to] = s <= e ? [s, e] : [e, s];
  const todayStr = today();
  if (to < todayStr) {
    return { ok: false, error: "That date range has already passed." };
  }
  if (from < todayStr) from = todayStr; // never close days already gone

  // Cap the span so a typo can't close hundreds of days.
  let span = 1;
  for (let d = from; d < to; d = addDays(d, 1)) {
    span++;
    if (span > 90) return { ok: false, error: "Range is too long (90 days max)." };
  }

  const r = reason?.trim() ? reason.trim().slice(0, 200) : null;
  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO closed_dates (date, reason, actor_name, actor_role)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET reason = excluded.reason`
  );
  let count = 0;
  const run = db.transaction(() => {
    for (let d = from; d <= to; d = addDays(d, 1)) {
      insert.run(d, r, actor.name, actor.role);
      count++;
    }
  });
  run();
  logAction(
    actor,
    "closure",
    `Closed ${from}${to !== from ? ` → ${to}` : ""} for bookings${r ? ` — ${r}` : ""} (${count} day${count === 1 ? "" : "s"})`
  );
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
