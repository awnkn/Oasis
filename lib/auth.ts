import crypto from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "oasis_admin";
const SESSION_DAYS = 7;

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || "change-me";
}

export function isDefaultPassword(): boolean {
  return getAdminPassword() === "change-me";
}

function getSecret(): Buffer {
  const secret = process.env.SESSION_SECRET || `oasis:${getAdminPassword()}`;
  return crypto.createHash("sha256").update(secret).digest();
}

export function checkPassword(candidate: string): boolean {
  const expected = crypto
    .createHash("sha256")
    .update(getAdminPassword())
    .digest();
  const actual = crypto.createHash("sha256").update(candidate).digest();
  return crypto.timingSafeEqual(expected, actual);
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

/** Token format: "<expiry-epoch-ms>.<hmac>" */
export function createSessionToken(): string {
  const expiry = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  return `${expiry}.${sign(String(expiry))}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot === -1) return false;
  const expiry = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!/^\d+$/.test(expiry) || Number(expiry) < Date.now()) return false;

  const expected = Buffer.from(sign(expiry), "hex");
  let actual: Buffer;
  try {
    actual = Buffer.from(signature, "hex");
  } catch {
    return false;
  }
  return (
    expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
  );
}

export async function isAdminAuthed(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(ADMIN_COOKIE)?.value);
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
