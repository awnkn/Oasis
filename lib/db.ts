import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { DEFAULT_DAILY_CAPACITY } from "./config";

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    date TEXT NOT NULL,
    guests INTEGER NOT NULL CHECK (guests > 0),
    price_per_guest REAL NOT NULL,
    total_price REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'approved', 'rejected')),
    rate_type TEXT NOT NULL DEFAULT 'standard'
      CHECK (rate_type IN ('standard', 'discounted', 'complimentary')),
    paid_amount REAL,
    paid_account TEXT,
    payment_method TEXT,
    heard_about TEXT,
    guest_status TEXT NOT NULL DEFAULT 'open',
    guest_status_at TEXT,
    checked_in_at TEXT,
    checked_in_count INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Append-only audit trail: rows are only ever inserted, never updated
  -- or deleted. There is intentionally no code path that modifies it.
  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER,
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

  -- Lightweight first-party analytics: page views and Book-button clicks.
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    meta TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_events_type_time ON events(type, created_at);

  -- Named staff accounts, managed from the dashboard by managers.
  CREATE TABLE IF NOT EXISTS staff_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('manager', 'staff')),
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
  CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  -- Ticketed events / activities (separate from the daily pass). Managed
  -- entirely from the admin dashboard; new events can be added any time.
  CREATE TABLE IF NOT EXISTS ticketed_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    tagline TEXT,
    description TEXT,
    highlights TEXT,           -- JSON array of bullet strings
    event_date TEXT,           -- YYYY-MM-DD (nullable)
    start_time TEXT,           -- free text, e.g. "8:00 PM"
    price REAL NOT NULL DEFAULT 0,
    price_note TEXT,           -- e.g. "includes shisha"
    capacity INTEGER,          -- nullable = unlimited
    location TEXT,
    hero_updated_at TEXT,      -- set when a hero photo exists (cache-buster)
    active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Hero photo bytes, kept out of the catalog row so listings stay light.
  -- Stored in the DB so images survive redeploys on the persistent disk.
  CREATE TABLE IF NOT EXISTS event_hero (
    event_id INTEGER PRIMARY KEY REFERENCES ticketed_events(id) ON DELETE CASCADE,
    data BLOB NOT NULL,
    content_type TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Reservations / ticket requests for an event (approved by staff, like bookings).
  CREATE TABLE IF NOT EXISTS event_tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL REFERENCES ticketed_events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    total_price REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'approved', 'rejected')),
    guest_status TEXT NOT NULL DEFAULT 'open',
    paid_amount REAL,
    paid_account TEXT,
    checked_in_count INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_event_tickets_event ON event_tickets(event_id);

  -- Per-customer CRM data (keyed by phone, the stable identifier). Visit
  -- history and spend are computed from bookings; this holds the manual
  -- extras: notes, tags and a VIP flag.
  CREATE TABLE IF NOT EXISTS customers (
    phone TEXT PRIMARY KEY,
    notes TEXT,
    tags TEXT,
    vip INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_bookings_phone ON bookings(phone);
`;

/** The event Oasis is launching with, inserted once on first run. */
const FIRST_EVENT = {
  slug: "ghannou-maana",
  title: "غنّو معنا",
  tagline: "An evening exclusively for the ladies ✨",
  description:
    "Join us for غنّو معنا, a night of live music, good company, and summer evenings done right. " +
    "Enjoy a live performance by a rising local artist, gather around a game of cards, and explore a " +
    "curated market by SYNC., featuring local brands and creative workshops.\n\n" +
    "F&B available for purchase — Al Ameed Coffee and Meat Me.\n\n" +
    "Reserve your spot and spend the evening with us at Oasis.",
  highlights: JSON.stringify([
    "Live music",
    "Cards & games",
    "Complimentary shisha",
    "Local market and workshops by SYNC.",
  ]),
  event_date: "2026-08-08",
  start_time: "8:00 PM",
  price: 15,
  price_note: "includes shisha",
  location: "Oasis by Azara · Amman",
};

function createDatabase(): Database.Database {
  const dbPath =
    process.env.DATABASE_PATH || path.join(process.cwd(), "data", "oasis.db");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA);

  // Upgrade databases created before these columns existed. SQLite can't add
  // CHECK constraints via ALTER, so those are enforced in lib/bookings.ts.
  const columns = (
    db.prepare("PRAGMA table_info(bookings)").all() as { name: string }[]
  ).map((c) => c.name);
  if (!columns.includes("rate_type")) {
    db.exec(
      "ALTER TABLE bookings ADD COLUMN rate_type TEXT NOT NULL DEFAULT 'standard'"
    );
  }
  if (!columns.includes("paid_amount")) {
    db.exec("ALTER TABLE bookings ADD COLUMN paid_amount REAL");
  }
  if (!columns.includes("heard_about")) {
    db.exec("ALTER TABLE bookings ADD COLUMN heard_about TEXT");
  }
  if (!columns.includes("paid_account")) {
    db.exec("ALTER TABLE bookings ADD COLUMN paid_account TEXT");
  }
  if (!columns.includes("checked_in_at")) {
    db.exec("ALTER TABLE bookings ADD COLUMN checked_in_at TEXT");
  }
  if (!columns.includes("payment_method")) {
    db.exec("ALTER TABLE bookings ADD COLUMN payment_method TEXT");
  }
  if (!columns.includes("guest_status")) {
    db.exec(
      "ALTER TABLE bookings ADD COLUMN guest_status TEXT NOT NULL DEFAULT 'open'"
    );
    // Bookings checked in before this column existed stay coherent.
    db.exec(
      "UPDATE bookings SET guest_status = 'checked_in' WHERE checked_in_at IS NOT NULL"
    );
  }
  if (!columns.includes("guest_status_at")) {
    db.exec("ALTER TABLE bookings ADD COLUMN guest_status_at TEXT");
  }
  if (!columns.includes("checked_in_count")) {
    db.exec(
      "ALTER TABLE bookings ADD COLUMN checked_in_count INTEGER NOT NULL DEFAULT 0"
    );
    // Bookings checked in before partial arrivals existed count in full.
    db.exec(
      "UPDATE bookings SET checked_in_count = guests WHERE checked_in_at IS NOT NULL"
    );
  }

  db.prepare(
    "INSERT OR IGNORE INTO settings (key, value) VALUES ('daily_capacity', ?)"
  ).run(String(DEFAULT_DAILY_CAPACITY));

  // Seed the launch event exactly once (never re-inserts if it's later
  // edited or deleted from the dashboard).
  const seeded = db
    .prepare("SELECT value FROM settings WHERE key = 'seeded_first_event'")
    .get() as { value: string } | undefined;
  if (!seeded) {
    db.prepare(
      `INSERT INTO ticketed_events
         (slug, title, tagline, description, highlights, event_date, start_time, price, price_note, location)
       VALUES (@slug, @title, @tagline, @description, @highlights, @event_date, @start_time, @price, @price_note, @location)`
    ).run(FIRST_EVENT);
    db.prepare(
      "INSERT INTO settings (key, value) VALUES ('seeded_first_event', '1')"
    ).run();
  }

  // Repair any event slugs that aren't URL-safe ASCII. An earlier version
  // let non-Latin titles (e.g. Arabic) produce non-ASCII slugs, which broke
  // the event page URLs. Idempotent: valid slugs are skipped.
  const eventsToCheck = db
    .prepare("SELECT id, title, slug FROM ticketed_events")
    .all() as { id: number; title: string; slug: string }[];
  for (const e of eventsToCheck) {
    if (/^[a-z0-9-]+$/.test(e.slug)) continue;
    let base = e.title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
    if (!base) base = e.title === FIRST_EVENT.title ? FIRST_EVENT.slug : `event-${e.id}`;
    let slug = base;
    let n = 2;
    while (
      db.prepare("SELECT id FROM ticketed_events WHERE slug = ? AND id != ?").get(slug, e.id)
    ) {
      slug = `${base}-${n++}`;
    }
    db.prepare("UPDATE ticketed_events SET slug = ? WHERE id = ?").run(slug, e.id);
  }

  return db;
}

// Kept on globalThis so dev-mode hot reloads reuse one connection.
const globalStore = globalThis as unknown as { __oasisDb?: Database.Database };

export function getDb(): Database.Database {
  if (!globalStore.__oasisDb) {
    globalStore.__oasisDb = createDatabase();
  }
  return globalStore.__oasisDb;
}
