import { NextResponse } from "next/server";
import { getAdminSession, isAdminAuthed } from "@/lib/auth";
import { getDailyCapacity, setDailyCapacity } from "@/lib/bookings";

export async function GET() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  return NextResponse.json({ dailyCapacity: getDailyCapacity() });
}

export async function PUT(request: Request) {
  const session = await getAdminSession();
  if (session?.role !== "manager") {
    return NextResponse.json(
      { error: "Only a manager can change the capacity." },
      { status: 403 }
    );
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

  setDailyCapacity(capacity, { name: session.name, role: session.role });
  return NextResponse.json({ ok: true, dailyCapacity: capacity });
}
