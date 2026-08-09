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

/** Send every due day-before reminder. Returns how many were sent. */
export async function runDueReminders(): Promise<number> {
  const ids = claimDueReminders();
  await Promise.allSettled(ids.map((id) => sendReminderNotifications(id)));
  return ids.length;
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
