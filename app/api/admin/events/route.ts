import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { createEvent, parseEventInput } from "@/lib/events";

// Managers create events; staff can only manage reservations.
export async function POST(request: Request) {
  const session = await getAdminSession();
  if (session?.role !== "manager") {
    return NextResponse.json({ error: "Managers only." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const input = parseEventInput(body);
  const result = createEvent(input, { name: session.name, role: session.role });
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json({ event: { id: result.event.id, slug: result.event.slug } }, { status: 201 });
}
