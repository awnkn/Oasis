import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import {
  BOOKING_STATUSES,
  RATE_TYPES,
  updateBookingPayment,
  updateBookingStatus,
  type BookingStatus,
  type PaymentUpdate,
  type RateType,
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
  const b = (body ?? {}) as Record<string, unknown>;

  // Status change (with the capacity re-check for restored bookings).
  if (b.status !== undefined) {
    if (
      typeof b.status !== "string" ||
      !BOOKING_STATUSES.includes(b.status as BookingStatus)
    ) {
      return NextResponse.json(
        { error: "Status must be pending, approved or rejected." },
        { status: 400 }
      );
    }
    const result = updateBookingStatus(bookingId, b.status as BookingStatus);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.message },
        { status: result.reason === "not_found" ? 404 : 409 }
      );
    }
  }

  // Payment details: rate type and/or amount actually paid.
  if (b.rateType !== undefined || b.paidAmount !== undefined) {
    const update: PaymentUpdate = {};
    if (b.rateType !== undefined) {
      if (
        typeof b.rateType !== "string" ||
        !RATE_TYPES.includes(b.rateType as RateType)
      ) {
        return NextResponse.json(
          { error: "Rate must be standard, discounted or complimentary." },
          { status: 400 }
        );
      }
      update.rateType = b.rateType as RateType;
    }
    if (b.paidAmount !== undefined) {
      if (b.paidAmount !== null && typeof b.paidAmount !== "number") {
        return NextResponse.json(
          { error: "Paid amount must be a number or null." },
          { status: 400 }
        );
      }
      update.paidAmount = b.paidAmount as number | null;
    }
    const result = updateBookingPayment(bookingId, update);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.message },
        { status: result.reason === "not_found" ? 404 : 400 }
      );
    }
  }

  if (
    b.status === undefined &&
    b.rateType === undefined &&
    b.paidAmount === undefined
  ) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
