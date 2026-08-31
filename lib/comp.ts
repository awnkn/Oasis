// Complimentary (free) access log. Standalone from bookings so staff can
// record anyone who entered for free — including guests who never booked —
// and backfill past visits by choosing an earlier date.

import { getDb } from "./db";
import { logAction, type Actor } from "./bookings";
import { isValidDateString, today } from "./dates";

export interface CompAccess {
  id: number;
  name: string;
  people: number;
  date: string;
  reason: string | null;
  actor_name: string;
  created_at: string;
}

export interface CompAccessSummary {
  /** People let in free, all time. */
  totalPeople: number;
  totalEntries: number;
  todayPeople: number;
  monthPeople: number;
}

export interface NewCompAccess {
  name: string;
  people: number;
  date: string;
  reason?: string | null;
}

export type CompResult = { ok: true; id: number } | { ok: false; error: string };

export function listCompAccess(limit = 500): CompAccess[] {
  return getDb()
    .prepare(
      `SELECT id, name, people, date, reason, actor_name, created_at
       FROM comp_access
       ORDER BY date DESC, id DESC
       LIMIT ?`
    )
    .all(limit) as CompAccess[];
}

export function compAccessSummary(): CompAccessSummary {
  const todayStr = today();
  const monthStart = todayStr.slice(0, 7) + "-01"; // first of the current month
  const row = getDb()
    .prepare(
      `SELECT
         COALESCE(SUM(people), 0) AS totalPeople,
         COUNT(*) AS totalEntries,
         COALESCE(SUM(CASE WHEN date = ? THEN people ELSE 0 END), 0) AS todayPeople,
         COALESCE(SUM(CASE WHEN date >= ? THEN people ELSE 0 END), 0) AS monthPeople
       FROM comp_access`
    )
    .get(todayStr, monthStart) as CompAccessSummary;
  return row;
}

export function addCompAccess(input: NewCompAccess, actor: Actor): CompResult {
  const name = input.name?.trim() ?? "";
  const reason = input.reason?.trim() || null;
  const date = input.date?.trim() ?? "";
  const people = input.people;

  if (name.length < 2 || name.length > 100) {
    return { ok: false, error: "Please enter a name (2 to 100 characters)." };
  }
  if (!Number.isInteger(people) || people < 1 || people > 500) {
    return { ok: false, error: "People must be a whole number between 1 and 500." };
  }
  if (!isValidDateString(date)) {
    return { ok: false, error: "Please choose a valid date." };
  }
  if (date > today()) {
    return { ok: false, error: "The date can't be in the future." };
  }
  if (reason && reason.length > 200) {
    return { ok: false, error: "Reason is too long (200 characters max)." };
  }

  const result = getDb()
    .prepare(
      `INSERT INTO comp_access (name, people, date, reason, actor_name, actor_role)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(name, people, date, reason, actor.name, actor.role);

  const id = Number(result.lastInsertRowid);
  logAction(
    actor,
    "comp_access",
    `Complimentary access: ${name} (${people} ${people === 1 ? "person" : "people"}, ${date})${reason ? ` — ${reason}` : ""}`
  );
  return { ok: true, id };
}

export function deleteCompAccess(id: number, actor: Actor): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT name, people, date FROM comp_access WHERE id = ?")
    .get(id) as { name: string; people: number; date: string } | undefined;
  if (!row) return false;
  db.prepare("DELETE FROM comp_access WHERE id = ?").run(id);
  logAction(
    actor,
    "comp_access",
    `Removed complimentary access: ${row.name} (${row.people} ${row.people === 1 ? "person" : "people"}, ${row.date})`
  );
  return true;
}
