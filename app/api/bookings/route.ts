import { NextResponse, after } from "next/server";
import { createBooking } from "@/lib/bookings";
import { sendApprovalNotifications } from "@/lib/notify";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export async function POST(request: Request) {
  // Stop automated spam from filling up availability with junk bookings.
  const limit = rateLimit(`book:${clientIp(request)}`, 8, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const result = createBooking({
    name: typeof b.name === "string" ? b.name : "",
    phone: typeof b.phone === "string" ? b.phone : "",
    email: typeof b.email === "string" ? b.email : undefined,
    date: typeof b.date === "string" ? b.date : "",
    session: b.session === "night" ? "night" : "day",
    guests: typeof b.guests === "number" ? b.guests : NaN,
    heardAbout: Array.isArray(b.heardAbout)
      ? b.heardAbout.filter((o): o is string => typeof o === "string")
      : undefined,
    paymentMethod: typeof b.paymentMethod === "string" ? b.paymentMethod : undefined,
    notes: typeof b.notes === "string" ? b.notes : undefined,
    termsAccepted: b.termsAccepted === true,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { booking } = result;
  // The booking is confirmed on creation, so send the guest their email and
  // WhatsApp confirmation right away, after the response is returned.
  after(() => sendApprovalNotifications(booking.id));

  return NextResponse.json(
    {
      booking: {
        id: booking.id,
        name: booking.name,
        date: booking.date,
        session: booking.session,
        guests: booking.guests,
        pricePerGuest: booking.price_per_guest,
        totalPrice: booking.total_price,
        status: booking.status,
      },
    },
    { status: 201 }
  );
}
