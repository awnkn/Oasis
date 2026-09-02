import { NextResponse } from "next/server";
import { getAnnouncement } from "@/lib/settings";

// Public: the rotating announcement banner shown at the top of the site.
// Read fresh on every request so edits from the dashboard show immediately.
export const dynamic = "force-dynamic";

export async function GET() {
  const a = getAnnouncement();
  return NextResponse.json(
    a.enabled ? { enabled: true, messages: a.messages } : { enabled: false, messages: [] },
    { headers: { "Cache-Control": "no-store" } }
  );
}
