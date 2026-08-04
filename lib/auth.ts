import crypto from "crypto";
import { cookies } from "next/headers";
import { getDb } from "./db";

export const ADMIN_COOKIE = "oasis_admin";
const SESSION_DAYS = 7;

export type AdminRole = "manager" | "staff";

// Two logins share one form: the password decides the role.
// Managers see everything (capacity, insights, accounting);
// staff manage bookings and payments only.
export function getManagerPassword(): string {
  return process.env.ADMIN_PASSWORD || "change-me";
}

export function getStaffPassword(): string {
  return process.env.STAFF_PASSWORD || "staff-change-me";
}

export function defaultPasswordsInUse(): { manager: boolean; staff: boolean } {
  return {
    manager: getManagerPassword() === "change-me",
    staff: getStaffPassword() === "staff-change-me",
  };
}

function getSecret(): Buffer {
  const secret =
    process.env.SESSION_SECRET ||
    `oasis:${getManagerPassword()}:${getStaffPassword()}`;
  return crypto.createHash("sha256").update(secret).digest();
}

function hashEquals(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/** Returns the role the password unlocks, or null if it matches neither. */
export function checkPassword(candidate: string): AdminRole | null {
  const manager = hashEquals(candidate, getManagerPassword());
  const staff = hashEquals(candidate, getStaffPassword());
  if (manager) return "manager";
  if (staff) return "staff";
  return null;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export interface AdminSession {
  role: AdminRole;
  /** The name the person typed at login — recorded in the audit log. */
  name: string;
}

export function sanitizeActorName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.trim().replace(/\s+/g, " ").slice(0, 40);
  return name.length >= 2 ? name : null;
}

/** Token format: "<role>.<base64url-name>.<expiry-epoch-ms>.<hmac>" */
export function createSessionToken(role: AdminRole, name: string): string {
  const expiry = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${role}.${Buffer.from(name, "utf8").toString("base64url")}.${expiry}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(
  token: string | undefined
): AdminSession | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [role, encodedName, expiry, signature] = parts;
  if (role !== "manager" && role !== "staff") return null;
  if (!/^\d+$/.test(expiry) || Number(expiry) < Date.now()) return null;

  const payload = `${role}.${encodedName}.${expiry}`;
  const expected = Buffer.from(sign(payload), "hex");
  let actual: Buffer;
  try {
    actual = Buffer.from(signature, "hex");
  } catch {
    return null;
  }
  const valid =
    expected.length === actual.length &&
    crypto.timingSafeEqual(expected, actual);
  if (!valid) return null;

  let name: string;
  try {
    name = Buffer.from(encodedName, "base64url").toString("utf8");
  } catch {
    return null;
  }
  return { role: role as AdminRole, name };
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  const session = verifySessionToken(store.get(ADMIN_COOKIE)?.value);
  if (!session) return null;

  // Re-check personal team accounts against the live database on every
  // request, so disabling someone (or changing their role) takes effect
  // immediately instead of lingering until their cookie expires. Logins
  // via the environment master passwords have no staff_users row and keep
  // the role baked into their signed token.
  const user = getDb()
    .prepare("SELECT role, active FROM staff_users WHERE name = ? COLLATE NOCASE")
    .get(session.name) as { role: AdminRole; active: number } | undefined;
  if (user) {
    if (!user.active) return null;
    return { role: user.role, name: session.name };
  }
  return session;
}

export async function getAdminRole(): Promise<AdminRole | null> {
  return (await getAdminSession())?.role ?? null;
}

export async function isAdminAuthed(): Promise<boolean> {
  return (await getAdminSession()) !== null;
}

export async function isManager(): Promise<boolean> {
  return (await getAdminRole()) === "manager";
}

export function sessionCookieOptions(request: Request) {
  const url = new URL(request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const isHttps = forwardedProto === "https" || url.protocol === "https:";
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isHttps,
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}
