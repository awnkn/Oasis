import { NextResponse } from "next/server";
import { getAdminSession, hashEquals } from "@/lib/auth";
import { runDueReminders } from "@/lib/reminders";

// Daily trigger for the day-before reminders. Point any scheduler at this
// once a day (Render Cron, cron-job.org, a GitHub Action…). Protected by
// CRON_SECRET; a signed-in admin may also call it to test by hand.
async function handle(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const key = new URL(request.url).searchParams.get("key") ?? "";

  // Constant-time comparison so the secret can't be guessed by timing.
  const bySecret =
    !!secret && (hashEquals(bearer, secret) || hashEquals(key, secret));
  const byAdmin = !!(await getAdminSession());
  if (!bySecret && !byAdmin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const reminded = await runDueReminders();
  return NextResponse.json({ ok: true, reminded });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}

export const dynamic = "force-dynamic";
