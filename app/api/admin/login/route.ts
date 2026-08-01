import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  checkPassword,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const password = (body as Record<string, unknown>)?.password;
  const role = typeof password === "string" ? checkPassword(password) : null;
  if (!role) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, role });
  response.cookies.set(
    ADMIN_COOKIE,
    createSessionToken(role),
    sessionCookieOptions(request)
  );
  return response;
}
