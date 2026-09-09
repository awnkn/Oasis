import { NextResponse, after } from "next/server";
import { remainingOn, sweepNoResponse } from "@/lib/bookings";
import { maybeRunDueReminders } from "@/lib/reminders";
import { isDateClosed } from "@/lib/closures";
import { isNightSwimDate } from "@/lib/nightSwim";
import { isNightSwimEnabled } from "@/lib/settings";
import {
  isValidDateString,
  isWeekend,
  priceForSession,
  today,
  addDays,
} from "@/lib/dates";
import { CURRENCY, MAX_ADVANCE_DAYS, NIGHT_SWIM_PRICE, NIGHT_SWIM_TIME } from "@/lib/config";

// Public availability: says only whether a day can take a booking — never
// how many spots remain. Exact counts stay on the admin dashboard.
export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date") ?? "";

  if (!isValidDateString(date)) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }

  sweepNoResponse();
  after(() => maybeRunDueReminders());
  const todayStr = today();
  const bookable =
    date >= todayStr && date <= addDays(todayStr, MAX_ADVANCE_DAYS);
  const closed = isDateClosed(date);
  // Night swim is offered only on the specific dates chosen in the dashboard,
  // and only while the master switch is on.
  const nightOffered = isNightSwimEnabled() && isNightSwimDate(date) && !closed;

  return NextResponse.json({
    date,
    bookable,
    closed,
    isWeekend: isWeekend(date),
    currency: CURRENCY,
    day: {
      available: !closed && remainingOn(date, "day") > 0,
      pricePerGuest: priceForSession(date, "day"),
    },
    night: {
      offered: nightOffered,
      available: nightOffered && remainingOn(date, "night") > 0,
      pricePerGuest: NIGHT_SWIM_PRICE,
      time: NIGHT_SWIM_TIME,
    },
  });
}
