// Small, typed accessors over the key/value `settings` table for
// manager-controlled site settings: the night-swim on/off switch and the
// rotating announcement banner. (Daily capacity lives in lib/bookings.ts.)

import { getDb } from "./db";
import { logAction, type Actor } from "./bookings";

function getRaw(key: string): string | undefined {
  const row = getDb()
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value;
}

function setRaw(key: string, value: string): void {
  getDb()
    .prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    )
    .run(key, value);
}

// ---------- night swim on/off ----------

/** Whether night-swim bookings are being taken. Defaults to on. */
export function isNightSwimEnabled(): boolean {
  return getRaw("night_swim_enabled") !== "0";
}

export function setNightSwimEnabled(enabled: boolean, actor: Actor): void {
  const previous = isNightSwimEnabled();
  setRaw("night_swim_enabled", enabled ? "1" : "0");
  if (previous !== enabled) {
    logAction(actor, "settings", `Night swim ${enabled ? "turned on" : "turned off"}`);
  }
}

// ---------- rotating announcement banner ----------

export interface Announcement {
  enabled: boolean;
  /** Lines that rotate through the banner, in order. */
  messages: string[];
}

const MAX_MESSAGES = 8;
const MAX_MESSAGE_LEN = 160;

export function getAnnouncement(): Announcement {
  const raw = getRaw("announcement");
  if (!raw) return { enabled: false, messages: [] };
  try {
    const parsed = JSON.parse(raw) as Partial<Announcement>;
    const messages = Array.isArray(parsed.messages)
      ? parsed.messages
          .filter((m): m is string => typeof m === "string")
          .map((m) => m.slice(0, MAX_MESSAGE_LEN))
          .slice(0, MAX_MESSAGES)
      : [];
    // A banner with no messages is effectively off.
    return { enabled: Boolean(parsed.enabled) && messages.length > 0, messages };
  } catch {
    return { enabled: false, messages: [] };
  }
}

export function setAnnouncement(
  input: { enabled: boolean; messages: string[] },
  actor: Actor
): Announcement {
  const messages = (Array.isArray(input.messages) ? input.messages : [])
    .map((m) => String(m).trim())
    .filter(Boolean)
    .map((m) => m.slice(0, MAX_MESSAGE_LEN))
    .slice(0, MAX_MESSAGES);
  const enabled = Boolean(input.enabled) && messages.length > 0;
  setRaw("announcement", JSON.stringify({ enabled, messages }));
  logAction(
    actor,
    "settings",
    `Announcement banner ${enabled ? "on" : "off"} (${messages.length} message${messages.length === 1 ? "" : "s"})`
  );
  return { enabled, messages };
}
