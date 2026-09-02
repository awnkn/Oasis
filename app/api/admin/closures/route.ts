import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { addClosedDate } from "@/lib/closures";

/** Mark a date closed for bookings. Manager-only. */
export async function POST(request: Request) {
  const session = await getAdminSession();
  if (session?.role !== "manager") {
    return NextResponse.json(
      { error: "Only a manager can change closures." },
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

  const result = addClosedDate(
    typeof b.date === "string" ? b.date : "",
    typeof b.reason === "string" ? b.reason : null,
    { name: session.name, role: session.role }
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
