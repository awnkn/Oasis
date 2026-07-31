import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { getDailyCapacity, setDailyCapacity } from "@/lib/bookings";

export async function GET() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  return NextResponse.json({ dailyCapacity: getDailyCapacity() });
}

export async function PUT(request: Request) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const capacity = (body as Record<string, unknown>)?.dailyCapacity;
  if (
    typeof capacity !== "number" ||
    !Number.isInteger(capacity) ||
    capacity < 0 ||
    capacity > 10000
  ) {
    return NextResponse.json(
      { error: "Capacity must be a whole number between 0 and 10000." },
      { status: 400 }
    );
  }

  setDailyCapacity(capacity);
  return NextResponse.json({ ok: true, dailyCapacity: capacity });
}
