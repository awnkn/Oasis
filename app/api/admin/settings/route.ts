import { NextResponse } from "next/server";
import { getAdminSession, isAdminAuthed } from "@/lib/auth";
import { getDailyCapacity, setDailyCapacity } from "@/lib/bookings";
import {
  getAnnouncement,
  isNightSwimEnabled,
  setAnnouncement,
  setNightSwimEnabled,
} from "@/lib/settings";

export async function GET() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  return NextResponse.json({
    dailyCapacity: getDailyCapacity(),
    nightSwimEnabled: isNightSwimEnabled(),
    announcement: getAnnouncement(),
  });
}

/**
 * Manager-only site settings. Any subset of { dailyCapacity, nightSwimEnabled,
 * announcement } may be sent; each provided field is validated and applied.
 */
export async function PUT(request: Request) {
  const session = await getAdminSession();
  if (session?.role !== "manager") {
    return NextResponse.json(
      { error: "Only a manager can change these settings." },
      { status: 403 }
    );
  }
  const actor = { name: session.name, role: session.role };

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  let touched = false;

  if (b.dailyCapacity !== undefined) {
    const capacity = b.dailyCapacity;
    if (
      typeof capacity !== "number" ||
      !Number.isInteger(capacity) ||
      capacity < 0 ||
      capacity > 10000
    ) {
      return NextResponse.json(
        { error: "Capacity must be a whole number between 0 and 10000." },
        { status: 400 }
      );
    }
    setDailyCapacity(capacity, actor);
    touched = true;
  }

  if (b.nightSwimEnabled !== undefined) {
    if (typeof b.nightSwimEnabled !== "boolean") {
      return NextResponse.json(
        { error: "nightSwimEnabled must be true or false." },
        { status: 400 }
      );
    }
    setNightSwimEnabled(b.nightSwimEnabled, actor);
    touched = true;
  }

  if (b.announcement !== undefined) {
    const a = b.announcement as Record<string, unknown>;
    if (typeof a !== "object" || a === null) {
      return NextResponse.json({ error: "Invalid announcement." }, { status: 400 });
    }
    const messages = Array.isArray(a.messages)
      ? a.messages.filter((m): m is string => typeof m === "string")
      : [];
    setAnnouncement({ enabled: a.enabled === true, messages }, actor);
    touched = true;
  }

  if (!touched) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    dailyCapacity: getDailyCapacity(),
    nightSwimEnabled: isNightSwimEnabled(),
    announcement: getAnnouncement(),
  });
}
