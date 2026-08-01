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
    heard_about TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
  CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

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

  db.prepare(
    "INSERT OR IGNORE INTO settings (key, value) VALUES ('daily_capacity', ?)"
  ).run(String(DEFAULT_DAILY_CAPACITY));

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
