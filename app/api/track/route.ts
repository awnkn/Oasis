import { NextResponse, after } from "next/server";
import { recordEvent } from "@/lib/bookings";
import { maybeRunDueReminders } from "@/lib/reminders";
import { clientIp, rateLimit } from "@/lib/ratelimit";

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
  // Keep the beacon cheap and un-abusable: cap page views per IP so the
  // events table can't be flooded. Always answer 204 so the beacon is silent.
  const limit = rateLimit(`track:${clientIp(request)}`, 60, 60 * 1000);
  if (limit.ok && b.type === "page_view" && typeof b.path === "string") {
    recordEvent("page_view", b.path.slice(0, 60));
  }
  // Public traffic doubles as a heartbeat for the day-before reminders
  // (throttled internally, so this stays cheap).
  after(() => maybeRunDueReminders());
  return new NextResponse(null, { status: 204 });
}
