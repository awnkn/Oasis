import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminRole } from "@/lib/auth";
import {
  listEvents,
  listTicketsForEvent,
  ticketSummary,
} from "@/lib/events";
import EventsAdmin from "@/components/EventsAdmin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Events — Admin" };

export default async function AdminEventsPage() {
  const role = await getAdminRole();
  if (!role) redirect("/admin/login");

  const events = listEvents(true).map((event) => ({
    event,
    tickets: listTicketsForEvent(event.id),
    summary: ticketSummary(event.id),
  }));

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      <header className="border-b border-zinc-200/70 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo-black.png" alt="Oasis by Azara" className="h-7 w-auto" />
            </Link>
            <span className="rounded-full bg-oasis-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-oasis-700">
              Events
            </span>
          </div>
          <Link
            href="/admin"
            className="text-sm font-medium text-oasis-800 hover:text-oasis-600"
          >
            ← Back to dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pt-8">
        <EventsAdmin events={events} role={role} />
      </main>
    </div>
  );
}
