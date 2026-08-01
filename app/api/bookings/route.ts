import { NextResponse } from "next/server";
import { createBooking } from "@/lib/bookings";

export async function POST(request: Request) {
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
    notes: typeof b.notes === "string" ? b.notes : undefined,
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
