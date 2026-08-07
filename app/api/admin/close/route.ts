import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { dayTakings, getDayClose, recordDayClose } from "@/lib/close";
import { isValidDateString, today } from "@/lib/dates";

// Cash reconciliation is a financial control — managers only.
export async function GET(request: Request) {
  const session = await getAdminSession();
  if (session?.role !== "manager") {
    return NextResponse.json({ error: "Managers only." }, { status: 403 });
  }
  const dateParam = new URL(request.url).searchParams.get("date") ?? "";
  const date = isValidDateString(dateParam) ? dateParam : today();
  return NextResponse.json({
    date,
    expected: dayTakings(date),
    close: getDayClose(date),
  });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (session?.role !== "manager") {
    return NextResponse.json({ error: "Managers only." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const date = typeof b.date === "string" ? b.date : "";
  const counted =
    b.counted && typeof b.counted === "object"
      ? (b.counted as Record<string, number>)
      : {};
  const notes = typeof b.notes === "string" ? b.notes : null;

  const result = recordDayClose(date, counted, notes, {
    name: session.name,
    role: session.role,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, close: result.close });
}
