import crypto from "crypto";
import { cookies } from "next/headers";

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

/** Token format: "<role>.<expiry-epoch-ms>.<hmac>" */
export function createSessionToken(role: AdminRole): string {
  const expiry = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${role}.${expiry}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(
  token: string | undefined
): AdminRole | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [role, expiry, signature] = parts;
  if (role !== "manager" && role !== "staff") return null;
  if (!/^\d+$/.test(expiry) || Number(expiry) < Date.now()) return null;

  const expected = Buffer.from(sign(`${role}.${expiry}`), "hex");
  let actual: Buffer;
  try {
    actual = Buffer.from(signature, "hex");
  } catch {
    return null;
  }
  const valid =
    expected.length === actual.length &&
    crypto.timingSafeEqual(expected, actual);
  return valid ? (role as AdminRole) : null;
}

export async function getAdminRole(): Promise<AdminRole | null> {
  const store = await cookies();
  return verifySessionToken(store.get(ADMIN_COOKIE)?.value);
}

export async function isAdminAuthed(): Promise<boolean> {
  return (await getAdminRole()) !== null;
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
