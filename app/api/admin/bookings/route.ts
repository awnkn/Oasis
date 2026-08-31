import { NextResponse, after } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { createManualBooking } from "@/lib/bookings";
import { sendApprovalNotifications } from "@/lib/notify";

/** Staff-entered booking (walk-in / phone booking) — created pre-approved. */
export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;

  const result = createManualBooking(
    {
      name: typeof b.name === "string" ? b.name : "",
      phone: typeof b.phone === "string" ? b.phone : "",
      email: typeof b.email === "string" ? b.email : undefined,
      date: typeof b.date === "string" ? b.date : "",
      session: b.session === "night" ? "night" : "day",
      guests: typeof b.guests === "number" ? b.guests : NaN,
      notes: typeof b.notes === "string" ? b.notes : undefined,
    },
    { name: session.name, role: session.role }
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // The booking is born approved, so the confirmation (email/WhatsApp,
  // whichever is configured) goes out right away unless staff unticked it.
  const bookingId = result.booking.id;
  if (b.sendConfirmation !== false) {
    after(() => sendApprovalNotifications(bookingId));
  }

  return NextResponse.json({ booking: { id: bookingId } }, { status: 201 });
}
