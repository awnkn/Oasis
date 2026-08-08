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

  const events = listEvents(true).map((event) => ({
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
