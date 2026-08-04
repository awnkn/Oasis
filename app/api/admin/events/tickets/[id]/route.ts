import { NextResponse, after } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { PAYMENT_ACCOUNTS } from "@/lib/config";
import {
  getEvent,
  getTicket,
  updateTicket,
  type EventGuestStatus,
  type EventTicketStatus,
  type TicketUpdate,
} from "@/lib/events";
import { sendEventApprovalEmail } from "@/lib/notify";

// Staff and managers manage event reservations (approve, check in, record payment).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const { id } = await params;
  const ticketId = Number.parseInt(id, 10);
  if (!Number.isInteger(ticketId)) {
    return NextResponse.json({ error: "Invalid reservation id." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;

  const update: TicketUpdate = {};
  if (b.status !== undefined) update.status = b.status as EventTicketStatus;
  if (b.guestStatus !== undefined) update.guestStatus = b.guestStatus as EventGuestStatus;
  if (b.checkedInCount !== undefined) {
    if (typeof b.checkedInCount !== "number") {
      return NextResponse.json({ error: "checkedInCount must be a number." }, { status: 400 });
    }
    update.checkedInCount = b.checkedInCount;
  }
  if (b.paidAmount !== undefined) {
    if (b.paidAmount !== null && typeof b.paidAmount !== "number") {
      return NextResponse.json({ error: "paidAmount must be a number or null." }, { status: 400 });
    }
    update.paidAmount = b.paidAmount as number | null;
  }
  if (b.paidAccount !== undefined) {
    update.paidAccount = b.paidAccount as string | null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  // Was this a fresh approval? (send the confirmation only on the transition)
  const before = getTicket(ticketId);
  const becomingApproved =
    update.status === "approved" && before?.status !== "approved";

  const result = updateTicket(
    ticketId,
    update,
    { name: session.name, role: session.role },
    PAYMENT_ACCOUNTS
  );
  if (!result.ok) {
    const status =
      result.reason === "not_found" ? 404 : result.reason === "capacity" ? 409 : 400;
    return NextResponse.json({ error: result.message }, { status });
  }

  if (becomingApproved) {
    const ticket = getTicket(ticketId);
    const event = ticket ? getEvent(ticket.event_id) : undefined;
    if (ticket && event) after(() => sendEventApprovalEmail(ticket, event));
  }

  return NextResponse.json({ ok: true });
}
