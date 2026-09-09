// Specific dates the night swim is open. Night swim is offered ONLY on the
// dates listed here — it is not tied to any weekday. The master on/off
// switch lives in lib/settings.ts (isNightSwimEnabled); this module manages
// the schedule of dates.

import { getDb } from "./db";
import { logAction, type Actor } from "./bookings";
import { isValidDateString, today } from "./dates";

export interface NightSwimDate {
  date: string;
  actor_name: string;
  created_at: string;
}

/** Upcoming night-swim dates (today onward), soonest first. */
export function listNightSwimDates(): NightSwimDate[] {
  return getDb()
    .prepare(
      `SELECT date, actor_name, created_at
       FROM night_swim_dates WHERE date >= ? ORDER BY date ASC`
    )
    .all(today()) as NightSwimDate[];
}

/** Just the upcoming dates as strings (for the public site / hints). */
export function upcomingNightSwimDates(limit = 8): string[] {
  return (
    getDb()
      .prepare(
        `SELECT date FROM night_swim_dates WHERE date >= ? ORDER BY date ASC LIMIT ?`
      )
      .all(today(), limit) as { date: string }[]
  ).map((r) => r.date);
}

export function isNightSwimDate(date: string): boolean {
  const row = getDb()
    .prepare("SELECT 1 AS x FROM night_swim_dates WHERE date = ?")
    .get(date);
  return Boolean(row);
}

export type NightDateResult = { ok: true } | { ok: false; error: string };

export function addNightSwimDate(date: string, actor: Actor): NightDateResult {
  const d = (date ?? "").trim();
  if (!isValidDateString(d)) {
    return { ok: false, error: "Please choose a valid date." };
  }
  if (d < today()) {
    return { ok: false, error: "That date has already passed." };
  }
  getDb()
    .prepare(
      `INSERT INTO night_swim_dates (date, actor_name, actor_role)
       VALUES (?, ?, ?)
       ON CONFLICT(date) DO NOTHING`
    )
    .run(d, actor.name, actor.role);
  logAction(actor, "night_swim", `Opened night swim on ${d}`);
  return { ok: true };
}

export function removeNightSwimDate(date: string, actor: Actor): boolean {
  const info = getDb()
    .prepare("DELETE FROM night_swim_dates WHERE date = ?")
    .run(date);
  if (info.changes > 0) {
    logAction(actor, "night_swim", `Closed night swim on ${date}`);
    return true;
  }
  return false;
}
