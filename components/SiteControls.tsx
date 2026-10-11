"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateLong } from "@/lib/dates";
import type { ClosedDate } from "@/lib/closures";
import type { NightSwimDate } from "@/lib/nightSwim";
import type { Announcement, BookingsStatus } from "@/lib/settings";
import { NIGHT_SWIM_PRICE, NIGHT_SWIM_TIME } from "@/lib/config";

/**
 * Manager-only front-of-house controls: the night-swim master switch and the
 * specific dates it runs on, the rotating announcement banner, and the days
 * the club is closed. Every change refreshes the page and is reflected on the
 * public site.
 */
export default function SiteControls({
  nightSwimEnabled,
  nightSwimDates,
  announcement,
  closedDates,
  bookingsStatus,
  today,
}: {
  nightSwimEnabled: boolean;
  nightSwimDates: NightSwimDate[];
  announcement: Announcement;
  closedDates: ClosedDate[];
  bookingsStatus: BookingsStatus;
  today: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");

  // Registrations master switch
  const [regClosed, setRegClosed] = useState(bookingsStatus.closed);
  const [regMessage, setRegMessage] = useState(bookingsStatus.message);
  const [regBusy, setRegBusy] = useState(false);
  const [regSaved, setRegSaved] = useState(false);

  // Night swim master switch + dates
  const [nightBusy, setNightBusy] = useState(false);
  const [nightDate, setNightDate] = useState("");
  const [nightDateBusy, setNightDateBusy] = useState(false);
  const [removingNight, setRemovingNight] = useState<string | null>(null);

  // Announcement
  const [annEnabled, setAnnEnabled] = useState(announcement.enabled);
  const [annText, setAnnText] = useState(announcement.messages.join("\n"));
  const [annBusy, setAnnBusy] = useState(false);
  const [annSaved, setAnnSaved] = useState(false);

  // Closures
  const [closeDate, setCloseDate] = useState("");
  const [closeEnd, setCloseEnd] = useState("");
  const [closeReason, setCloseReason] = useState("");
  const [closeBusy, setCloseBusy] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  async function putSettings(body: Record<string, unknown>): Promise<boolean> {
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "Could not save the change.");
      return false;
    }
    return true;
  }

  async function saveRegistrations(closedNext: boolean) {
    setRegBusy(true);
    setError("");
    setRegSaved(false);
    try {
      if (await putSettings({ bookings: { closed: closedNext, message: regMessage.trim() } })) {
        setRegClosed(closedNext);
        setRegSaved(true);
        router.refresh();
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setRegBusy(false);
    }
  }

  async function toggleNight() {
    setNightBusy(true);
    setError("");
    try {
      if (await putSettings({ nightSwimEnabled: !nightSwimEnabled })) router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setNightBusy(false);
    }
  }

  async function addNightDate(e: React.FormEvent) {
    e.preventDefault();
    setNightDateBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/night-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: nightDate }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Could not add that night-swim date.");
        return;
      }
      setNightDate("");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setNightDateBusy(false);
    }
  }

  async function removeNightDate(date: string) {
    setRemovingNight(date);
    setError("");
    try {
      const res = await fetch(`/api/admin/night-dates/${date}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Could not remove that date.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setRemovingNight(null);
    }
  }

  async function saveAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    setAnnBusy(true);
    setError("");
    setAnnSaved(false);
    const messages = annText.split("\n").map((m) => m.trim()).filter(Boolean);
    try {
      if (await putSettings({ announcement: { enabled: annEnabled, messages } })) {
        setAnnSaved(true);
        router.refresh();
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setAnnBusy(false);
    }
  }

  async function addClosure(e: React.FormEvent) {
    e.preventDefault();
    setCloseBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/closures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: closeDate,
          endDate: closeEnd || closeDate,
          reason: closeReason.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Could not close those days.");
        return;
      }
      setCloseDate("");
      setCloseEnd("");
      setCloseReason("");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setCloseBusy(false);
    }
  }

  async function removeClosure(date: string) {
    setRemoving(date);
    setError("");
    try {
      const res = await fetch(`/api/admin/closures/${date}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Could not reopen that day.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setRemoving(null);
    }
  }

  const messageCount = annText.split("\n").map((m) => m.trim()).filter(Boolean).length;

  return (
    <section className="mt-8 sm:mt-10">
      <h2 className="text-lg font-semibold tracking-tight">Site controls</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Manager-only. Changes here show on the public website.
      </p>

      {error && (
        <p className="mt-4 rounded-xl bg-blush-100 px-4 py-3 text-sm text-blush-700">{error}</p>
      )}

      {/* Registrations master switch */}
      <div
        className={`mt-4 rounded-2xl p-5 shadow-sm ring-1 ${
          regClosed ? "bg-blush-100/60 ring-blush-200" : "bg-white ring-black/5"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold">
              {regClosed ? "🔒 Registrations are CLOSED" : "🔓 Registrations are open"}
            </h3>
            <p className="mt-1 text-sm text-zinc-600">
              {regClosed
                ? "Guests can't book day swims, night swims or events. Walk-ins you add from the dashboard still work."
                : "Guests can book normally. Close this to stop all public bookings and event reservations at once."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => saveRegistrations(!regClosed)}
            disabled={regBusy}
            className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-medium text-white transition disabled:opacity-40 ${
              regClosed ? "bg-oasis-600 hover:bg-oasis-700" : "bg-blush-600 hover:bg-blush-700"
            }`}
          >
            {regBusy ? "Saving…" : regClosed ? "Reopen registrations" : "Close registrations"}
          </button>
        </div>
        <div className="mt-4">
          <label htmlFor="reg-msg" className="mb-1 block text-xs font-medium text-zinc-500">
            Message guests see while closed
          </label>
          <textarea
            id="reg-msg"
            rows={2}
            maxLength={280}
            value={regMessage}
            onChange={(e) => {
              setRegMessage(e.target.value);
              setRegSaved(false);
            }}
            placeholder="e.g. We're closed for the season — bookings reopen in May 2027."
            className="w-full rounded-xl border border-oasis-950/10 bg-white px-3 py-2 text-sm outline-none focus:border-oasis-950/25"
          />
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-zinc-400">
              Shown on the booking and event pages.
              {regSaved && <span className="ml-2 text-emerald-600">Saved ✓</span>}
            </p>
            <button
              type="button"
              onClick={() => saveRegistrations(regClosed)}
              disabled={regBusy}
              className="rounded-full border border-oasis-950/10 px-4 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-40"
            >
              Save message
            </button>
          </div>
        </div>
      </div>

      {/* Night swim: master switch + the exact dates it runs */}
      <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold">🌙 Night swim</h3>
            <p className="mt-1 text-sm text-zinc-500">
              {nightSwimEnabled
                ? "On — guests can book the night swim on the dates you add below."
                : "Off — night swim is hidden from the site and can't be booked, whatever dates are listed."}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              {NIGHT_SWIM_TIME} · {NIGHT_SWIM_PRICE} JOD per guest
            </p>
          </div>
          <button
            type="button"
            onClick={toggleNight}
            disabled={nightBusy}
            role="switch"
            aria-checked={nightSwimEnabled}
            aria-label="Toggle night swim"
            className={`relative mt-1 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition disabled:opacity-50 ${
              nightSwimEnabled ? "bg-oasis-600" : "bg-zinc-300"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                nightSwimEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* The dates the night swim runs on */}
        <div className="mt-4 border-t border-zinc-100 pt-4">
          <p className="text-sm font-medium">Night-swim dates</p>
          <p className="mt-0.5 text-sm text-zinc-500">
            Pick the exact evenings the night swim is open. Only these dates
            offer it — nothing is scheduled automatically.
          </p>
          <form onSubmit={addNightDate} className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="night-date" className="mb-1 block text-xs font-medium text-zinc-500">Date</label>
              <input
                id="night-date"
                type="date"
                required
                min={today}
                value={nightDate}
                onChange={(e) => setNightDate(e.target.value)}
                className="rounded-xl border border-oasis-950/10 bg-white px-3 py-2 text-sm outline-none focus:border-oasis-950/25"
              />
            </div>
            <button
              type="submit"
              disabled={nightDateBusy || !nightDate}
              className="rounded-full bg-oasis-950 px-5 py-2 text-sm font-medium text-white transition hover:bg-oasis-800 disabled:opacity-40"
            >
              {nightDateBusy ? "Adding…" : "Open this date"}
            </button>
          </form>

          <div className="mt-3">
            {nightSwimDates.length === 0 ? (
              <p className="rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-400">
                No night-swim dates yet — add one above to offer it.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {nightSwimDates.map((n) => (
                  <li
                    key={n.date}
                    className="flex items-center gap-2 rounded-full bg-oasis-950 py-1 pl-3 pr-1 text-xs font-medium text-white"
                  >
                    {formatDateLong(n.date)}
                    <button
                      onClick={() => removeNightDate(n.date)}
                      disabled={removingNight === n.date}
                      aria-label={`Remove night swim on ${n.date}`}
                      className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/30 disabled:opacity-40"
                    >
                      {removingNight === n.date ? "…" : "×"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Announcement banner */}
      <form
        onSubmit={saveAnnouncement}
        className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5"
      >
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-semibold">📣 Announcement banner</h3>
          <label className="flex items-center gap-2 text-sm text-zinc-600">
            <input
              type="checkbox"
              checked={annEnabled}
              onChange={(e) => setAnnEnabled(e.target.checked)}
              className="h-4 w-4 accent-oasis-600"
            />
            Show on site
          </label>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          One message per line. Multiple lines rotate at the top of every page.
        </p>
        <textarea
          value={annText}
          onChange={(e) => {
            setAnnText(e.target.value);
            setAnnSaved(false);
          }}
          rows={3}
          maxLength={1400}
          placeholder={"e.g. Open all week 10am–8pm\nNight swim this Friday 🌙"}
          className="mt-3 w-full rounded-xl border border-oasis-950/10 bg-white px-3 py-2 text-sm outline-none focus:border-oasis-950/25"
        />
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-zinc-400">
            {messageCount} {messageCount === 1 ? "message" : "messages"}
            {annSaved && <span className="ml-2 text-emerald-600">Saved ✓</span>}
          </p>
          <button
            type="submit"
            disabled={annBusy}
            className="rounded-full bg-oasis-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-oasis-700 disabled:opacity-40"
          >
            {annBusy ? "Saving…" : "Save banner"}
          </button>
        </div>
      </form>

      {/* Closed days */}
      <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h3 className="font-semibold">🚫 Closed days</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Close a single day or a date range to take zero bookings (day and
          night). Guests see those days as unavailable immediately. Leave “To”
          empty to close just one day.
        </p>
        <form onSubmit={addClosure} className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="close-date" className="mb-1 block text-xs font-medium text-zinc-500">From</label>
            <input
              id="close-date"
              type="date"
              required
              min={today}
              value={closeDate}
              onChange={(e) => setCloseDate(e.target.value)}
              className="rounded-xl border border-oasis-950/10 bg-white px-3 py-2 text-sm outline-none focus:border-oasis-950/25"
            />
          </div>
          <div>
            <label htmlFor="close-end" className="mb-1 block text-xs font-medium text-zinc-500">
              To <span className="font-normal text-zinc-400">(optional)</span>
            </label>
            <input
              id="close-end"
              type="date"
              min={closeDate || today}
              value={closeEnd}
              onChange={(e) => setCloseEnd(e.target.value)}
              className="rounded-xl border border-oasis-950/10 bg-white px-3 py-2 text-sm outline-none focus:border-oasis-950/25"
            />
          </div>
          <div className="min-w-[12rem] flex-1">
            <label htmlFor="close-reason" className="mb-1 block text-xs font-medium text-zinc-500">
              Reason <span className="font-normal text-zinc-400">(optional)</span>
            </label>
            <input
              id="close-reason"
              maxLength={200}
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              placeholder="e.g. private event, maintenance"
              className="w-full rounded-xl border border-oasis-950/10 bg-white px-3 py-2 text-sm outline-none focus:border-oasis-950/25"
            />
          </div>
          <button
            type="submit"
            disabled={closeBusy || !closeDate}
            className="rounded-full bg-oasis-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-oasis-800 disabled:opacity-40"
          >
            {closeBusy ? "Closing…" : "Close these days"}
          </button>
        </form>

        <div className="mt-4">
          {closedDates.length === 0 ? (
            <p className="rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-400">
              No upcoming closed days.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {closedDates.map((c) => (
                <li key={c.date} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">{formatDateLong(c.date)}</p>
                    {c.reason && <p className="text-xs text-zinc-500">{c.reason}</p>}
                  </div>
                  <button
                    onClick={() => removeClosure(c.date)}
                    disabled={removing === c.date}
                    className="rounded-full border border-oasis-950/10 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-40"
                  >
                    {removing === c.date ? "Reopening…" : "Reopen"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
