import { NextResponse } from "next/server";
import { getDailyCapacity, remainingOn } from "@/lib/bookings";
import { isValidDateString, isWeekend, priceForDate, today, addDays } from "@/lib/dates";
import { CURRENCY, MAX_ADVANCE_DAYS } from "@/lib/config";

export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date") ?? "";

  if (!isValidDateString(date)) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }

  const todayStr = today();
  const bookable =
    date >= todayStr && date <= addDays(todayStr, MAX_ADVANCE_DAYS);

  return NextResponse.json({
    date,
    bookable,
    remaining: remainingOn(date),
    capacity: getDailyCapacity(),
    pricePerGuest: priceForDate(date),
    isWeekend: isWeekend(date),
    currency: CURRENCY,
  });
}
