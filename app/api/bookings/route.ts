import { NextResponse } from "next/server";
import { createBooking } from "@/lib/bookings";
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
  return NextResponse.json(
    {
      booking: {
        id: booking.id,
        name: booking.name,
        date: booking.date,
        guests: booking.guests,
        pricePerGuest: booking.price_per_guest,
        totalPrice: booking.total_price,
        status: booking.status,
      },
    },
    { status: 201 }
  );
}
