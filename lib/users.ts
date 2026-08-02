import crypto from "crypto";
import { getDb } from "./db";
import { logAction, type Actor } from "./bookings";
import type { AdminRole } from "./auth";

export interface StaffUser {
  id: number;
  name: string;
  role: AdminRole;
  active: number;
  created_at: string;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, "hex");
  return (
    candidate.length === expected.length &&
    crypto.timingSafeEqual(candidate, expected)
  );
}

export function listUsers(): StaffUser[] {
  return getDb()
    .prepare(
      "SELECT id, name, role, active, created_at FROM staff_users ORDER BY active DESC, name COLLATE NOCASE"
    )
    .all() as StaffUser[];
}

export function findUserByName(name: string):
  | (StaffUser & { password_hash: string })
  | undefined {
  return getDb()
    .prepare("SELECT * FROM staff_users WHERE name = ? COLLATE NOCASE")
    .get(name.trim()) as (StaffUser & { password_hash: string }) | undefined;
}

export type UserResult = { ok: true } | { ok: false; message: string };

export function createUser(
  name: string,
  password: string,
  role: AdminRole,
  actor: Actor
): UserResult {
  const clean = name.trim().replace(/\s+/g, " ");
  if (clean.length < 2 || clean.length > 40) {
    return { ok: false, message: "Name must be 2–40 characters." };
  }
  if (password.length < 6) {
    return { ok: false, message: "Password must be at least 6 characters." };
  }
  if (role !== "manager" && role !== "staff") {
    return { ok: false, message: "Role must be manager or staff." };
  }
  if (findUserByName(clean)) {
    return { ok: false, message: "A team member with that name already exists." };
  }
  getDb()
    .prepare(
      "INSERT INTO staff_users (name, password_hash, role) VALUES (?, ?, ?)"
    )
    .run(clean, hashPassword(password), role);
  logAction(actor, "team", `Added ${role} account "${clean}"`);
  return { ok: true };
}

export function updateUser(
  id: number,
  changes: { active?: boolean; password?: string; role?: AdminRole },
  actor: Actor
): UserResult {
  const user = getDb()
    .prepare("SELECT id, name, role, active FROM staff_users WHERE id = ?")
    .get(id) as StaffUser | undefined;
  if (!user) return { ok: false, message: "Team member not found." };

  if (changes.password !== undefined) {
    if (changes.password.length < 6) {
      return { ok: false, message: "Password must be at least 6 characters." };
    }
    getDb()
      .prepare("UPDATE staff_users SET password_hash = ? WHERE id = ?")
      .run(hashPassword(changes.password), id);
    logAction(actor, "team", `Reset password for "${user.name}"`);
  }
  if (changes.role !== undefined && changes.role !== user.role) {
    if (changes.role !== "manager" && changes.role !== "staff") {
      return { ok: false, message: "Role must be manager or staff." };
    }
    getDb()
      .prepare("UPDATE staff_users SET role = ? WHERE id = ?")
      .run(changes.role, id);
    logAction(actor, "team", `Changed "${user.name}" role: ${user.role} → ${changes.role}`);
  }
  if (changes.active !== undefined && changes.active !== Boolean(user.active)) {
    getDb()
      .prepare("UPDATE staff_users SET active = ? WHERE id = ?")
      .run(changes.active ? 1 : 0, id);
    logAction(
      actor,
      "team",
      `${changes.active ? "Enabled" : "Disabled"} account "${user.name}"`
    );
  }
  return { ok: true };
}
