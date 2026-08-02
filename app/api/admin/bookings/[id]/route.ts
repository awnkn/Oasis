import { NextResponse, after } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { sendApprovalNotifications } from "@/lib/notify";
import {
  BOOKING_STATUSES,
  RATE_TYPES,
  setCheckedIn,
  updateBookingPayment,
  updateBookingStatus,
  type BookingStatus,
  type PaymentUpdate,
  type RateType,
} from "@/lib/bookings";
import { PAYMENT_ACCOUNTS } from "@/lib/config";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const actor = { name: session.name, role: session.role };

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
    const result = updateBookingStatus(
      bookingId,
      b.status as BookingStatus,
      actor
    );
    if (!result.ok) {
      return NextResponse.json(
        { error: result.message },
        { status: result.reason === "not_found" ? 404 : 409 }
      );
    }
    // Guest notifications (WhatsApp/email) fire only on a real transition
    // into "approved", after the response is sent.
    if (result.changed && b.status === "approved") {
      after(() => sendApprovalNotifications(bookingId));
    }
  }

  // Check-in / undo check-in.
  if (b.checkedIn !== undefined) {
    if (typeof b.checkedIn !== "boolean") {
      return NextResponse.json(
        { error: "checkedIn must be true or false." },
        { status: 400 }
      );
    }
    const result = setCheckedIn(bookingId, b.checkedIn, actor);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.message },
        { status: result.reason === "not_found" ? 404 : 409 }
      );
    }
  }

  // Payment details: rate type, amount paid, and the account it went to.
  if (
    b.rateType !== undefined ||
    b.paidAmount !== undefined ||
    b.paidAccount !== undefined
  ) {
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
    if (b.paidAccount !== undefined) {
      if (
        b.paidAccount !== null &&
        (typeof b.paidAccount !== "string" ||
          !(PAYMENT_ACCOUNTS as readonly string[]).includes(b.paidAccount))
      ) {
        return NextResponse.json(
          { error: `Account must be one of: ${PAYMENT_ACCOUNTS.join(", ")}.` },
          { status: 400 }
        );
      }
      update.paidAccount = b.paidAccount as string | null;
    }
    const result = updateBookingPayment(bookingId, update, actor);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.message },
        { status: result.reason === "not_found" ? 404 : 400 }
      );
    }
  }

  if (
    b.status === undefined &&
    b.checkedIn === undefined &&
    b.rateType === undefined &&
    b.paidAmount === undefined &&
    b.paidAccount === undefined
  ) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
