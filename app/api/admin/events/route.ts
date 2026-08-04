import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { createEvent, type EventInput } from "@/lib/events";

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

export function parseEventInput(body: unknown): EventInput {
  const b = (body ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  const strOrNull = (v: unknown) =>
    v === null ? null : typeof v === "string" ? v : undefined;
  return {
    title: str(b.title),
    tagline: strOrNull(b.tagline),
    description: strOrNull(b.description),
    highlights: Array.isArray(b.highlights)
      ? b.highlights.filter((h): h is string => typeof h === "string")
      : undefined,
    eventDate: strOrNull(b.eventDate),
    startTime: strOrNull(b.startTime),
    price: typeof b.price === "number" ? b.price : undefined,
    priceNote: strOrNull(b.priceNote),
    capacity:
      b.capacity === null
        ? null
        : typeof b.capacity === "number"
          ? b.capacity
          : undefined,
    location: strOrNull(b.location),
    active: typeof b.active === "boolean" ? b.active : undefined,
  };
}
