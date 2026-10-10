import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { addClosedDateRange } from "@/lib/closures";

/** Mark a date (or a date range) closed for bookings. Manager-only. */
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

  // Accept a range (startDate/endDate) or a single date (date).
  const start =
    typeof b.startDate === "string"
      ? b.startDate
      : typeof b.date === "string"
        ? b.date
        : "";
  const end =
    typeof b.endDate === "string" && b.endDate ? b.endDate : start;

  const result = addClosedDateRange(
    start,
    end,
    typeof b.reason === "string" ? b.reason : null,
    { name: session.name, role: session.role }
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
