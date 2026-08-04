import { NextResponse } from "next/server";
import { createTicket } from "@/lib/events";

// Public: reserve tickets for an event (approved later by staff, like a booking).
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;

  const result = createTicket({
    eventId: typeof b.eventId === "number" ? b.eventId : NaN,
    name: typeof b.name === "string" ? b.name : "",
    phone: typeof b.phone === "string" ? b.phone : "",
    email: typeof b.email === "string" ? b.email : undefined,
    quantity: typeof b.quantity === "number" ? b.quantity : NaN,
    notes: typeof b.notes === "string" ? b.notes : undefined,
    termsAccepted: b.termsAccepted === true,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { ticket, event } = result;
  return NextResponse.json(
    {
      ticket: {
        id: ticket.id,
        name: ticket.name,
        quantity: ticket.quantity,
        totalPrice: ticket.total_price,
        eventTitle: event.title,
        eventDate: event.event_date,
        startTime: event.start_time,
      },
    },
    { status: 201 }
  );
}
