// End-of-day cash reconciliation. Compares what the system recorded as
// collected for a day (day-pass bookings + event tickets, by account)
// against what staff actually counted, and stores the close.

import { getDb } from "./db";
import { logAction, type Actor } from "./bookings";
import { PAYMENT_ACCOUNTS } from "./config";
import { isValidDateString } from "./dates";

export type AccountTotals = Record<string, number> & { total: number };

/** Money recorded for a given day, split by account (bookings + events). */
export function dayTakings(date: string): AccountTotals {
  const db = getDb();
  const out: AccountTotals = { total: 0 } as AccountTotals;
  for (const a of PAYMENT_ACCOUNTS) out[a] = 0;

  const bookingRows = db
    .prepare(
      `SELECT paid_account AS account, COALESCE(SUM(paid_amount), 0) AS total
       FROM bookings
       WHERE date = ? AND paid_amount IS NOT NULL AND paid_account IS NOT NULL
       GROUP BY paid_account`
    )
    .all(date) as { account: string; total: number }[];

  // Event tickets for events happening on that day.
  const eventRows = db
    .prepare(
      `SELECT t.paid_account AS account, COALESCE(SUM(t.paid_amount), 0) AS total
       FROM event_tickets t JOIN ticketed_events e ON e.id = t.event_id
       WHERE e.event_date = ? AND t.paid_amount IS NOT NULL AND t.paid_account IS NOT NULL
       GROUP BY t.paid_account`
    )
    .all(date) as { account: string; total: number }[];

  for (const r of [...bookingRows, ...eventRows]) {
    if (r.account in out) {
      out[r.account] += r.total;
      out.total += r.total;
    }
  }
  return out;
}

export interface DayClose {
  date: string;
  expected: AccountTotals;
  counted: AccountTotals;
  variance: number;
  notes: string | null;
  closed_by: string;
  closed_at: string;
}

function parse(row: {
  date: string;
  expected: string;
  counted: string;
  variance: number;
  notes: string | null;
  closed_by: string;
  closed_at: string;
}): DayClose {
  return {
    date: row.date,
    expected: JSON.parse(row.expected),
    counted: JSON.parse(row.counted),
    variance: row.variance,
    notes: row.notes,
    closed_by: row.closed_by,
    closed_at: row.closed_at,
  };
}

export function getDayClose(date: string): DayClose | null {
  const row = getDb()
    .prepare("SELECT * FROM day_closes WHERE date = ?")
    .get(date) as Parameters<typeof parse>[0] | undefined;
  return row ? parse(row) : null;
}

export function recentCloses(limit = 30): DayClose[] {
  const rows = getDb()
    .prepare("SELECT * FROM day_closes ORDER BY date DESC LIMIT ?")
    .all(limit) as Parameters<typeof parse>[0][];
  return rows.map(parse);
}

export type CloseResult = { ok: true; close: DayClose } | { ok: false; message: string };

/** Record (or update) a day's close with the counted amounts. */
export function recordDayClose(
  date: string,
  counted: Record<string, number>,
  notes: string | null,
  actor: Actor
): CloseResult {
  if (!isValidDateString(date)) return { ok: false, message: "Invalid date." };

  const countedTotals: AccountTotals = { total: 0 } as AccountTotals;
  for (const a of PAYMENT_ACCOUNTS) {
    const v = Number(counted[a] ?? 0);
    if (!Number.isFinite(v) || v < 0 || v > 1_000_000) {
      return { ok: false, message: `Counted ${a} must be a number of 0 or more.` };
    }
    countedTotals[a] = Math.round(v * 100) / 100;
    countedTotals.total += countedTotals[a];
  }
  if (notes && notes.length > 500) {
    return { ok: false, message: "Notes are too long (500 characters max)." };
  }

  const expected = dayTakings(date);
  const variance = Math.round((countedTotals.total - expected.total) * 100) / 100;

  getDb()
    .prepare(
      `INSERT INTO day_closes (date, expected, counted, variance, notes, closed_by, closed_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(date) DO UPDATE SET
         expected = excluded.expected, counted = excluded.counted,
         variance = excluded.variance, notes = excluded.notes,
         closed_by = excluded.closed_by, closed_at = excluded.closed_at`
    )
    .run(
      date,
      JSON.stringify(expected),
      JSON.stringify(countedTotals),
      variance,
      notes,
      actor.name
    );

  const varLabel =
    variance === 0 ? "balanced" : variance > 0 ? `over by ${variance}` : `short by ${Math.abs(variance)}`;
  logAction(
    actor,
    "cash_close",
    `Closed ${date}: counted ${countedTotals.total} JOD vs ${expected.total} expected (${varLabel} JOD)`
  );

  return { ok: true, close: getDayClose(date)! };
}
