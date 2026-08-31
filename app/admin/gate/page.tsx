import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminRole } from "@/lib/auth";
import {
  bookedGuestsOn,
  checkedInGuestsToday,
  listBookings,
  sweepNoResponse,
} from "@/lib/bookings";
import { customerBadges } from "@/lib/customers";
import { today, formatDateLong } from "@/lib/dates";
import GateMode from "@/components/GateMode";

export const dynamic = "force-dynamic";
export const metadata = { title: "Gate check-in" };

export default async function GatePage() {
  const role = await getAdminRole();
  if (!role) redirect("/admin/login");

  sweepNoResponse();
  const todayStr = today();
  // The gate shows guests who may still walk in. Bookings that have clearly
  // ended — cancelled, or already marked a no-show — are left off so the
  // check-in list stays clean and matches the day's guest count.
  const ENDED = ["cancelled", "cancelled_no_response", "no_show"];
  const bookings = listBookings({ date: todayStr, status: "approved" }).filter(
    (b) => !ENDED.includes(b.guest_status)
  );
  const badges = customerBadges(bookings.map((b) => b.phone));

  return (
    <div className="min-h-screen bg-zinc-100">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo-black.png" alt="Oasis by Azara" className="h-7 w-auto" />
            </Link>
            <span className="rounded-full bg-oasis-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-oasis-700">
              Gate
            </span>
          </div>
          <Link href="/admin" className="text-sm font-medium text-oasis-800 hover:text-oasis-600">
            ← Dashboard
          </Link>
        </div>
      </header>

      <GateMode
        bookings={bookings}
        badges={badges}
        guestsToday={bookedGuestsOn(todayStr)}
        checkedInToday={checkedInGuestsToday()}
        todayLabel={formatDateLong(todayStr)}
      />
    </div>
  );
}
