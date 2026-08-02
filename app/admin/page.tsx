import { redirect } from "next/navigation";
import AdminDashboard from "@/components/AdminDashboard";
import { defaultPasswordsInUse, getAdminRole } from "@/lib/auth";
import {
  BOOKING_STATUSES,
  bookedGuestsOn,
  bookingsTodayCount,
  checkedInGuestsToday,
  getDailyCapacity,
  listBookings,
  occupancySummary,
  type BookingStatus,
} from "@/lib/bookings";
import { isValidDateString, today } from "@/lib/dates";
import { getDb } from "@/lib/db";
import { listUsers } from "@/lib/users";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin" };

interface SearchParams {
  status?: string;
  date?: string;
  past?: string;
  q?: string;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const role = await getAdminRole();
  if (!role) {
    redirect("/admin/login");
  }

  const params = await searchParams;
  const status = BOOKING_STATUSES.includes(params.status as BookingStatus)
    ? (params.status as BookingStatus)
    : undefined;
  const date =
    params.date && isValidDateString(params.date) ? params.date : undefined;
  const includePast = params.past === "1";
  const query =
    typeof params.q === "string" && params.q.trim()
      ? params.q.trim().slice(0, 60)
      : undefined;

  const bookings = listBookings({ status, date, includePast, query });
  const todayStr = today();

  const pendingRow = getDb()
    .prepare(
      "SELECT COUNT(*) AS n FROM bookings WHERE status = 'pending' AND date >= ?"
    )
    .get(todayStr) as { n: number };

  return (
    <AdminDashboard
      bookings={bookings}
      capacity={getDailyCapacity()}
      summary={occupancySummary(14)}
      pendingCount={pendingRow.n}
      guestsToday={bookedGuestsOn(todayStr)}
      bookingsToday={bookingsTodayCount()}
      checkedInToday={checkedInGuestsToday()}
      today={todayStr}
      filters={{ status: status ?? "", date: date ?? "", includePast, query: query ?? "" }}
      role={role}
      team={role === "manager" ? listUsers() : []}
      showPasswordWarning={
        role === "manager" &&
        (defaultPasswordsInUse().manager || defaultPasswordsInUse().staff)
      }
    />
  );
}
