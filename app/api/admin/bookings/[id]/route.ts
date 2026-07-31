import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import {
  BOOKING_STATUSES,
  updateBookingStatus,
  type BookingStatus,
} from "@/lib/bookings";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { id } = await params;
  const bookingId = Number.parseInt(id, 10);
  if (!Number.isInteger(bookingId) || bookingId < 1) {
    return NextResponse.json({ error: "Invalid booking id." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const status = (body as Record<string, unknown>)?.status;
  if (
    typeof status !== "string" ||
    !BOOKING_STATUSES.includes(status as BookingStatus)
  ) {
    return NextResponse.json(
      { error: "Status must be pending, approved or rejected." },
      { status: 400 }
    );
  }

  const updated = updateBookingStatus(bookingId, status as BookingStatus);
  if (!updated) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
