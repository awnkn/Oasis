import { redirect } from "next/navigation";
import { getAdminRole } from "@/lib/auth";
import { recentActivity } from "@/lib/bookings";
import AdminShell from "@/components/AdminShell";

export const dynamic = "force-dynamic";

export const metadata = { title: "Activity log" };

/** SQLite UTC timestamp → Amman-local display. */
function formatWhen(utc: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Amman",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(utc.replace(" ", "T") + "Z"));
}

export default async function ActivityPage() {
  const role = await getAdminRole();
  if (!role) redirect("/admin/login");
  if (role !== "manager") redirect("/admin");

  const activity = recentActivity(200);

  return (
    <AdminShell role={role} maxWidthClass="max-w-5xl">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Activity log</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Every sign-in, approval, rejection, guest-status change, payment,
          check-in, capacity change and team change — permanent and uneditable,
          recorded under each person&apos;s name. Times are Amman local time.
          Showing the latest 200 entries.
        </p>

        <div className="mt-4 space-y-2">
          {activity.length === 0 && (
            <div className="rounded-2xl bg-white px-6 py-12 text-center text-sm text-zinc-400 shadow-sm ring-1 ring-black/5">
              No activity recorded yet.
            </div>
          )}
          {activity.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-xl bg-white px-5 py-3 text-sm shadow-sm ring-1 ring-black/5"
            >
              <span className="w-28 shrink-0 text-xs text-zinc-400">
                {formatWhen(entry.created_at)}
              </span>
              <span className="font-medium">{entry.actor_name}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${
                  entry.actor_role === "manager"
                    ? "bg-oasis-100 text-oasis-700"
                    : entry.actor_role === "system"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {entry.actor_role}
              </span>
              <span className="min-w-0 flex-1 text-zinc-700">{entry.details}</span>
            </div>
          ))}
        </div>
    </AdminShell>
  );
}
