import { NextResponse, after } from "next/server";
import { remainingOn, sweepNoResponse } from "@/lib/bookings";
import { maybeRunDueReminders } from "@/lib/reminders";
import {
  isValidDateString,
  isNightSwimDay,
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
  const nightOffered = isNightSwimDay(date);

  return NextResponse.json({
    date,
    bookable,
    isWeekend: isWeekend(date),
    currency: CURRENCY,
    day: {
      available: remainingOn(date, "day") > 0,
      pricePerGuest: priceForSession(date, "day"),
    },
    night: {
      // Night swims run on Thursdays only.
      offered: nightOffered,
      available: nightOffered && remainingOn(date, "night") > 0,
      pricePerGuest: NIGHT_SWIM_PRICE,
      time: NIGHT_SWIM_TIME,
    },
  });
}
