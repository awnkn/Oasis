import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { deleteEvent, updateEvent } from "@/lib/events";
import { parseEventInput } from "../route";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (session?.role !== "manager") {
    return NextResponse.json({ error: "Managers only." }, { status: 403 });
  }
  const { id } = await params;
  const eventId = Number.parseInt(id, 10);
  if (!Number.isInteger(eventId)) {
    return NextResponse.json({ error: "Invalid event id." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const result = updateEvent(eventId, parseEventInput(body), {
    name: session.name,
    role: session.role,
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.message },
      { status: result.message === "Event not found." ? 404 : 400 }
    );
  }
  return NextResponse.json({ ok: true, slug: result.event.slug });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (session?.role !== "manager") {
    return NextResponse.json({ error: "Managers only." }, { status: 403 });
  }
  const { id } = await params;
  const eventId = Number.parseInt(id, 10);
  if (!Number.isInteger(eventId)) {
    return NextResponse.json({ error: "Invalid event id." }, { status: 400 });
  }
  if (!deleteEvent(eventId, { name: session.name, role: session.role })) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
