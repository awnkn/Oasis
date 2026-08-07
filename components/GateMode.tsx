"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Booking } from "@/lib/bookings";
import type { CustomerBadge } from "@/lib/customers";

function badgePill(badge?: CustomerBadge) {
  if (badge?.vip)
    return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-300">★ VIP</span>;
  if (badge && badge.count >= 2)
    return <span className="rounded-full bg-oasis-100 px-2 py-0.5 text-xs font-semibold text-oasis-700">Returning</span>;
  if (badge && badge.count === 1)
    return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">New</span>;
  return null;
}

export default function GateMode({
  bookings,
  badges,
  guestsToday,
  checkedInToday,
  todayLabel,
}: {
  bookings: Booking[];
  badges: Record<string, CustomerBadge>;
  guestsToday: number;
  checkedInToday: number;
  todayLabel: string;
  }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = term
      ? bookings.filter(
          (b) =>
            b.name.toLowerCase().includes(term) ||
            b.phone.replace(/\D/g, "").includes(term.replace(/\D/g, ""))
        )
      : bookings;
    // Not arrived first, then partial, then fully in at the bottom.
    const rank = (b: Booking) =>
      b.checked_in_count === 0 ? 0 : b.checked_in_count < b.guests ? 1 : 2;
    return [...list].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  }, [bookings, q]);

  const remaining = Math.max(0, guestsToday - checkedInToday);

  async function patch(id: number, body: Record<string, unknown>) {
    setBusy(id);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        setMessage(d?.error || "Could not update.");
        return;
      }
      router.refresh();
    } catch {
      setMessage("Could not reach the server.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      {/* Counter */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-3xl bg-oasis-950 p-6 text-white">
          <p className="text-sm text-white/60">Checked in today</p>
          <p className="mt-1 text-5xl font-semibold tracking-tight">
            {checkedInToday}
            <span className="text-2xl text-white/40"> / {guestsToday}</span>
          </p>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <p className="text-sm text-zinc-500">Still expected</p>
          <p className="mt-1 text-5xl font-semibold tracking-tight text-amber-600">{remaining}</p>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <p className="text-sm text-zinc-500">Today</p>
          <p className="mt-2 text-lg font-semibold leading-tight">{todayLabel}</p>
          <p className="mt-1 text-sm text-zinc-400">{bookings.length} approved bookings</p>
        </div>
      </div>

      {/* Search */}
      <div className="sticky top-3 z-10 mt-5">
        <input
          type="search"
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a guest by name or phone…"
          className="w-full rounded-2xl border border-oasis-950/10 bg-white px-5 py-4 text-lg shadow-sm outline-none transition focus:border-oasis-500 focus:ring-4 focus:ring-oasis-500/10"
        />
      </div>

      {message && (
        <p className="mt-4 rounded-xl bg-rose-100 px-4 py-3 text-sm text-rose-600">{message}</p>
      )}

      {/* Guest list */}
      <div className="mt-4 space-y-3">
        {filtered.length === 0 && (
          <div className="rounded-2xl bg-white p-10 text-center text-zinc-400 shadow-sm ring-1 ring-black/5">
            {q ? "No guest matches that search." : "No approved bookings for today yet."}
          </div>
        )}
        {filtered.map((b) => {
          const allIn = b.checked_in_count >= b.guests;
          const owed = b.rate_type === "complimentary" ? 0 : Math.max(0, b.total_price - (b.paid_amount ?? 0));
          return (
            <div
              key={b.id}
              className={`flex flex-wrap items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 transition sm:p-5 ${
                allIn ? "opacity-60 ring-black/5" : "ring-black/5"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-semibold">{b.name}</p>
                  {badgePill(badges[b.phone])}
                  {owed > 0 ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      Owes {owed} JOD
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      Paid
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-zinc-500">
                  {b.phone} · {b.guests} {b.guests === 1 ? "guest" : "guests"}
                </p>
              </div>

              {/* Arrivals stepper */}
              <div className="flex items-center gap-2">
                <button
                  aria-label="One fewer"
                  disabled={busy === b.id || b.checked_in_count === 0}
                  onClick={() => patch(b.id, { checkedInCount: b.checked_in_count - 1 })}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-oasis-950/10 text-xl text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-30"
                >
                  −
                </button>
                <span
                  className={`min-w-16 text-center text-2xl font-semibold ${
                    allIn ? "text-teal-600" : b.checked_in_count > 0 ? "text-amber-600" : "text-zinc-400"
                  }`}
                >
                  {b.checked_in_count}/{b.guests}
                </span>
                <button
                  aria-label="One more"
                  disabled={busy === b.id || b.checked_in_count >= b.guests}
                  onClick={() => patch(b.id, { checkedInCount: b.checked_in_count + 1 })}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-oasis-950/10 text-xl text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-30"
                >
                  +
                </button>
              </div>

              <button
                disabled={busy === b.id || allIn}
                onClick={() => patch(b.id, { checkedInCount: b.guests })}
                className="rounded-full bg-oasis-600 px-6 py-3 text-base font-medium text-white transition hover:bg-oasis-700 disabled:cursor-default disabled:opacity-30"
              >
                {allIn ? "All in ✓" : "Check in all"}
              </button>
            </div>
          );
        })}
      </div>
    </main>
  );
}
