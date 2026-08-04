import { NextResponse } from "next/server";
import { getEventHero } from "@/lib/events";

// Public: serve an event's hero photo (stored in the database).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const eventId = Number.parseInt(id, 10);
  if (!Number.isInteger(eventId)) {
    return new NextResponse(null, { status: 404 });
  }
  const hero = getEventHero(eventId);
  if (!hero) return new NextResponse(null, { status: 404 });

  return new NextResponse(new Uint8Array(hero.data), {
    headers: {
      "Content-Type": hero.content_type,
      // Immutable per version — pages append ?v=<hero_updated_at>.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
