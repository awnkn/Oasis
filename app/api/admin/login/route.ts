import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  checkPassword,
  createSessionToken,
  sanitizeActorName,
  sessionCookieOptions,
} from "@/lib/auth";
import { logAction } from "@/lib/bookings";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const name = sanitizeActorName(b?.name);
  if (!name) {
    return NextResponse.json(
      { error: "Please enter your name (at least 2 characters)." },
      { status: 400 }
    );
  }

  const password = b?.password;
  const role = typeof password === "string" ? checkPassword(password) : null;
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
