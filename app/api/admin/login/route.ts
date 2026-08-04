import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  checkPassword,
  createSessionToken,
  sanitizeActorName,
  sessionCookieOptions,
  type AdminRole,
} from "@/lib/auth";
import { logAction } from "@/lib/bookings";
import { findUserByName, verifyPassword } from "@/lib/users";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export async function POST(request: Request) {
  // Slow down password guessing: cap attempts per IP.
  const limit = rateLimit(`login:${clientIp(request)}`, 12, 5 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many sign-in attempts. Please wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  let name = sanitizeActorName(b?.name);
  if (!name) {
    return NextResponse.json(
      { error: "Please enter your name (at least 2 characters)." },
      { status: 400 }
    );
  }
  const password = typeof b?.password === "string" ? b.password : "";

  // Personal team accounts first; the environment passwords remain as
  // master keys so a manager can never be locked out.
  let role: AdminRole | null = null;
  const user = findUserByName(name);
  if (user) {
    if (!user.active) {
      return NextResponse.json(
        { error: "This account has been disabled." },
        { status: 401 }
      );
    }
    if (verifyPassword(password, user.password_hash)) {
      role = user.role;
      name = user.name;
    }
  } else {
    role = checkPassword(password);
  }
  if (!role) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  logAction({ name, role }, "login", `${name} signed in as ${role}`);

  const response = NextResponse.json({ ok: true, role });
  response.cookies.set(
    ADMIN_COOKIE,
    createSessionToken(role, name),
    sessionCookieOptions(request)
  );
  return response;
}
