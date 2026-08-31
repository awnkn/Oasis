// Day-before reminders. A booking is reminded once, the day before the
// visit, on whichever channels are configured (email and/or WhatsApp).

import { getDb } from "./db";
import { RELEASING_GUEST_STATUSES } from "./bookings";
import { sendReminderNotifications } from "./notify";
import { addDays, today } from "./dates";

/**
 * Claim the bookings due a reminder: approved, still active, happening
 * tomorrow, and not yet reminded. Marks them reminded inside the same
 * transaction, so a booking is never reminded twice even if two sweeps run
 * at once. Returns the claimed ids to send.
 */
function claimDueReminders(): number[] {
  const tomorrow = addDays(today(), 1);
  const db = getDb();
  return db.transaction((): number[] => {
    const due = db
      .prepare(
        `SELECT id FROM bookings
         WHERE date = ? AND status = 'approved'
           AND guest_status NOT IN ${RELEASING_GUEST_STATUSES}
           AND reminder_sent_at IS NULL`
      )
      .all(tomorrow) as { id: number }[];
    const mark = db.prepare(
      "UPDATE bookings SET reminder_sent_at = datetime('now') WHERE id = ?"
    );
    for (const r of due) mark.run(r.id);
    return due.map((r) => r.id);
  })();
}

/** Release a failed claim so the reminder is retried on the next sweep. */
function unclaimReminders(ids: number[]): void {
  if (ids.length === 0) return;
  const db = getDb();
  const stmt = db.prepare("UPDATE bookings SET reminder_sent_at = NULL WHERE id = ?");
  db.transaction(() => {
    for (const id of ids) stmt.run(id);
  })();
}

/**
 * Send every due day-before reminder. Claims each booking first (so a
 * booking is never reminded twice), then releases any whose delivery
 * actually failed so the next sweep tries again. Returns how many were sent.
 */
export async function runDueReminders(): Promise<number> {
  const ids = claimDueReminders();
  const outcomes = await Promise.allSettled(
    ids.map((id) => sendReminderNotifications(id))
  );
  let sent = 0;
  const retry: number[] = [];
  outcomes.forEach((o, i) => {
    if (o.status === "fulfilled" && o.value === "sent") sent += 1;
    else if (o.status === "fulfilled" && o.value === "failed") retry.push(ids[i]);
    else if (o.status === "rejected") retry.push(ids[i]);
  });
  unclaimReminders(retry);
  return sent;
}

// The site runs as one long-lived server, so a module-level timestamp keeps
// the opportunistic sweep from running on every single request.
let lastSweep = 0;
const SWEEP_INTERVAL_MS = 15 * 60 * 1000;

/**
 * Best-effort trigger, safe to call from any hot public route. Runs at most
 * once every 15 minutes; the daily cron endpoint is the real guarantee.
 */
export async function maybeRunDueReminders(): Promise<void> {
  const now = Date.now();
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  try {
    await runDueReminders();
  } catch {
    // A reminder sweep must never break the request that triggered it.
  }
}
