import fs from "fs";
import os from "os";
import path from "path";
import { getDb } from "./db";
import { logAction } from "./bookings";
import { today } from "./dates";
import { CLUB_NAME } from "./config";

const SYSTEM = { name: "System", role: "system" };

/** Where the automatic daily backup is emailed. */
export const BACKUP_EMAIL = process.env.BACKUP_EMAIL || "rama@amoux.co";

/** Consistent snapshot of the live database (safe under WAL). */
export async function createBackupBuffer(): Promise<Buffer> {
  const tmp = path.join(os.tmpdir(), `oasis-backup-${process.pid}-${Math.random().toString(36).slice(2)}.db`);
  await getDb().backup(tmp);
  const buf = fs.readFileSync(tmp);
  fs.unlinkSync(tmp);
  return buf;
}

function ammanHour(): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Amman",
      hour: "2-digit",
      hour12: false,
    }).format(new Date())
  );
}

/**
 * Email today's backup once per day (after 06:00 Amman), if Resend is
 * configured. The date is claimed in settings before sending so
 * concurrent requests can't double-send; on failure the claim is
 * released so the next hourly tick retries.
 */
export async function sendDailyBackupIfDue(): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return;

  const db = getDb();
  const todayStr = today();
  const row = db
    .prepare("SELECT value FROM settings WHERE key = 'last_backup_date'")
    .get() as { value: string } | undefined;
  if (row?.value === todayStr) return;
  if (ammanHour() < 6) return;

  db.prepare(
    `INSERT INTO settings (key, value) VALUES ('last_backup_date', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(todayStr);

  try {
    const buf = await createBackupBuffer();
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${CLUB_NAME} <${from}>`,
        to: [BACKUP_EMAIL],
        subject: `Oasis daily backup — ${todayStr}`,
        text:
          `Attached is the full ${CLUB_NAME} booking database as of ${todayStr} ` +
          `(${Math.round(buf.length / 1024)} KB). Keep a few recent copies somewhere safe.`,
        attachments: [
          {
            filename: `oasis-backup-${todayStr}.db`,
            content: buf.toString("base64"),
          },
        ],
      }),
    });
    if (!res.ok) {
      throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    logAction(
      SYSTEM,
      "backup",
      `Daily backup emailed to ${BACKUP_EMAIL} (${Math.round(buf.length / 1024)} KB)`
    );
  } catch (err) {
    db.prepare(
      "DELETE FROM settings WHERE key = 'last_backup_date' AND value = ?"
    ).run(todayStr);
    logAction(
      SYSTEM,
      "backup_failed",
      `Daily backup failed: ${String(err).slice(0, 200)}`
    );
  }
}

/** Hourly check, started once per server process from instrumentation. */
export function startBackupScheduler(): void {
  const g = globalThis as unknown as { __oasisBackupTimer?: ReturnType<typeof setInterval> };
  if (g.__oasisBackupTimer) return;
  g.__oasisBackupTimer = setInterval(
    () => void sendDailyBackupIfDue().catch(() => {}),
    60 * 60 * 1000
  );
  setTimeout(() => void sendDailyBackupIfDue().catch(() => {}), 15_000);
}
