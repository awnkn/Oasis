import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { addNightSwimDate } from "@/lib/nightSwim";

/** Open the night swim on a specific date. Manager-only. */
export async function POST(request: Request) {
  const session = await getAdminSession();
  if (session?.role !== "manager") {
    return NextResponse.json(
      { error: "Only a manager can change night-swim dates." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;

  const result = addNightSwimDate(typeof b.date === "string" ? b.date : "", {
    name: session.name,
    role: session.role,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
