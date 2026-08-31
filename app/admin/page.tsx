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
  sweepNoResponse,
  type BookingStatus,
  type GuestStatus,
} from "@/lib/bookings";
import { GUEST_STATUSES } from "@/lib/config";
import { isValidDateString, today } from "@/lib/dates";
import { getDb } from "@/lib/db";
import { listUsers } from "@/lib/users";
import { customerBadges } from "@/lib/customers";
import { compAccessSummary, listCompAccess } from "@/lib/comp";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin" };

interface SearchParams {
  status?: string;
  gs?: string;
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

  sweepNoResponse();
  const params = await searchParams;
  const status = BOOKING_STATUSES.includes(params.status as BookingStatus)
    ? (params.status as BookingStatus)
    : undefined;
  const guestStatus = GUEST_STATUSES.includes(params.gs as GuestStatus)
    ? (params.gs as GuestStatus)
    : undefined;
  const date =
    params.date && isValidDateString(params.date) ? params.date : undefined;
  const includePast = params.past === "1";
  const query =
    typeof params.q === "string" && params.q.trim()
      ? params.q.trim().slice(0, 60)
      : undefined;

  const bookings = listBookings({ status, guestStatus, date, includePast, query });
  const badges = customerBadges(bookings.map((b) => b.phone));
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
      filters={{
        status: status ?? "",
        guestStatus: guestStatus ?? "",
        date: date ?? "",
        includePast,
        query: query ?? "",
      }}
      role={role}
      team={role === "manager" ? listUsers() : []}
      badges={badges}
      compSummary={compAccessSummary()}
      compEntries={listCompAccess()}
      showPasswordWarning={
        role === "manager" &&
        (defaultPasswordsInUse().manager || defaultPasswordsInUse().staff)
      }
    />
  );
}
