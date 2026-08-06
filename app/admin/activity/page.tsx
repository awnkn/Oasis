import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminRole } from "@/lib/auth";
import { recentActivity } from "@/lib/bookings";
import { ArrowLeft } from "@/components/icons";

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
    <div className="min-h-screen bg-surface-sunken pb-20">
      <header className="border-b border-line/70 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo-black.png"
                alt="Oasis by Azara"
                className="h-7 w-auto"
              />
            </Link>
            <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Activity log
            </span>
          </div>
          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-oasis-800 hover:text-oasis-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-5xl px-6 pt-8">
        <p className="text-sm text-ink-muted">
          Every sign-in, approval, rejection, guest-status change, payment,
          check-in, capacity change and team change — permanent and uneditable,
          recorded under each person&apos;s name. Times are Amman local time.
          Showing the latest 200 entries.
        </p>

        <div className="mt-4 space-y-2">
          {activity.length === 0 && (
            <div className="rounded-2xl bg-white px-6 py-12 text-center text-sm text-ink-subtle shadow-sm ring-1 ring-black/5">
              No activity recorded yet.
            </div>
          )}
          {activity.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-xl bg-white px-5 py-3 text-sm shadow-sm ring-1 ring-black/5"
            >
              <span className="w-28 shrink-0 text-xs text-ink-subtle">
                {formatWhen(entry.created_at)}
              </span>
              <span className="font-medium">{entry.actor_name}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${
                  entry.actor_role === "manager"
                    ? "bg-oasis-100 text-oasis-700"
                    : entry.actor_role === "system"
                      ? "bg-status-caution-tint text-status-caution"
                      : "bg-surface-muted text-ink-muted"
                }`}
              >
                {entry.actor_role}
              </span>
              <span className="min-w-0 flex-1 text-ink">{entry.details}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
