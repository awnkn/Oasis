import { NextResponse, after } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { createManualTicket, getEvent } from "@/lib/events";
import { sendEventApprovalEmail } from "@/lib/notify";

/** Staff-entered event reservation (walk-in / phone) — created pre-approved. */
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

  const result = createManualTicket(
    {
      eventId: typeof b.eventId === "number" ? b.eventId : NaN,
      name: typeof b.name === "string" ? b.name : "",
      phone: typeof b.phone === "string" ? b.phone : "",
      email: typeof b.email === "string" ? b.email : undefined,
      quantity: typeof b.quantity === "number" ? b.quantity : NaN,
      notes: typeof b.notes === "string" ? b.notes : undefined,
    },
    { name: session.name, role: session.role }
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Send the guest their confirmation email (if one is set and Resend is
  // configured) unless staff unticked it.
  if (b.sendConfirmation !== false) {
    const { ticket } = result;
    const event = getEvent(ticket.event_id);
    if (event) after(() => sendEventApprovalEmail(ticket, event));
  }

  return NextResponse.json({ ticket: { id: result.ticket.id } }, { status: 201 });
}
