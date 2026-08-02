import { NextResponse } from "next/server";
import { recordEvent } from "@/lib/bookings";

// Anonymous page-view beacon from the public site. Book-button clicks are
// recorded server-side by the /book page, not here.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  if (b.type === "page_view" && typeof b.path === "string") {
    recordEvent("page_view", b.path.slice(0, 60));
  }
  return new NextResponse(null, { status: 204 });
}
