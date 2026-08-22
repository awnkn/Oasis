import { redirect } from "next/navigation";
import { getAdminRole } from "@/lib/auth";
import {
  listEvents,
  listTicketsForEvent,
  ticketSummary,
} from "@/lib/events";
import AdminShell from "@/components/AdminShell";
import EventsAdmin from "@/components/EventsAdmin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Events — Admin" };

export default async function AdminEventsPage() {
  const role = await getAdminRole();
  if (!role) redirect("/admin/login");

  // Newest events at the top, older/past ones at the bottom (undated drafts
  // last). The public site keeps its own soonest-first ordering.
  const events = listEvents(true)
    .sort((a, b) => {
      const ad = a.event_date;
      const bd = b.event_date;
      if (ad && bd) return ad < bd ? 1 : ad > bd ? -1 : 0;
      if (ad && !bd) return -1;
      if (!ad && bd) return 1;
      return a.created_at < b.created_at ? 1 : -1;
    })
    .map((event) => ({
      event,
      tickets: listTicketsForEvent(event.id),
      summary: ticketSummary(event.id),
    }));

  return (
    <AdminShell role={role} maxWidthClass="max-w-6xl">
      <EventsAdmin events={events} role={role} />
    </AdminShell>
  );
}
