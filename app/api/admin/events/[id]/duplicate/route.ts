import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { duplicateEvent } from "@/lib/events";

// Managers only: copy an event into a new hidden draft.
export async function POST(
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
  const result = duplicateEvent(eventId, { name: session.name, role: session.role });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.message },
      { status: result.message === "Event not found." ? 404 : 400 }
    );
  }
  return NextResponse.json(
    { event: { id: result.event.id, slug: result.event.slug } },
    { status: 201 }
  );
}
