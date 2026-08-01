"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  Booking,
  BookingStatus,
  DaySummary,
  RateType,
} from "@/lib/bookings";
import { formatDateLong, formatDateShort } from "@/lib/dates";

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-oasis-100 text-oasis-700",
  rejected: "bg-blush-100 text-blush-500",
};

const RATE_BADGES: Record<Exclude<RateType, "standard">, string> = {
  discounted: "bg-amber-100 text-amber-800",
  complimentary: "bg-blush-100 text-blush-500",
};

function PaymentEditor({
  booking,
  onError,
  onSaved,
}: {
  booking: Booking;
  onError: (message: string) => void;
  onSaved: () => void;
}) {
  const propPaid =
    booking.paid_amount === null ? "" : String(booking.paid_amount);
  const [rate, setRate] = useState<RateType>(booking.rate_type);
  const [paid, setPaid] = useState(propPaid);
  const [saving, setSaving] = useState(false);

  // Resync after a refresh brings new server values.
  useEffect(() => {
    setRate(booking.rate_type);
    setPaid(booking.paid_amount === null ? "" : String(booking.paid_amount));
  }, [booking.rate_type, booking.paid_amount]);

  const dirty = rate !== booking.rate_type || paid !== propPaid;

  async function save() {
    const trimmed = paid.trim();
    const amount = trimmed === "" ? null : Number(trimmed);
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) {
      onError("Paid amount must be a number of 0 or more.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rateType: rate, paidAmount: amount }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        onError(data?.error || "Could not save the payment.");
        return;
      }
      onSaved();
    } catch {
      onError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <select
        aria-label={`Rate for booking ${booking.id}`}
        value={rate}
        onChange={(e) => {
          const next = e.target.value as RateType;
          setRate(next);
          if (next === "complimentary") setPaid("0");
        }}
        className="w-36 rounded-lg border border-oasis-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-oasis-500"
      >
        <option value="standard">Standard</option>
        <option value="discounted">Discounted</option>
        <option value="complimentary">Complimentary</option>
      </select>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          aria-label={`Amount paid for booking ${booking.id}`}
          min={0}
          step="0.01"
          placeholder="—"
          value={paid}
          onChange={(e) => setPaid(e.target.value)}
          className="w-20 rounded-lg border border-oasis-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-oasis-500"
        />
        <span className="text-xs text-oasis-900/50">JOD paid</span>
      </div>
      {dirty && (
        <button
          onClick={save}
          disabled={saving}
          className="w-fit rounded-full bg-oasis-600 px-4 py-1 text-xs font-medium text-white transition hover:bg-oasis-700 disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      )}
    </div>
  );
}

interface Filters {
  status: string;
  date: string;
  includePast: boolean;
}

export default function AdminDashboard({
  bookings,
  capacity,
  summary,
  pendingCount,
  guestsToday,
  today,
  filters,
  showPasswordWarning,
}: {
  bookings: Booking[];
  capacity: number;
  summary: DaySummary[];
  pendingCount: number;
  guestsToday: number;
  today: string;
  filters: Filters;
  showPasswordWarning: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [capacityInput, setCapacityInput] = useState(String(capacity));
  const [savingCapacity, setSavingCapacity] = useState(false);
  const [busyBooking, setBusyBooking] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  // Another admin (or a router.refresh after an action) may have changed the
  // capacity — keep the input in step so a stale Save can't revert it.
  useEffect(() => {
    setCapacityInput(String(capacity));
  }, [capacity]);

  function applyFilters(next: Partial<Filters>) {
    // Merge on top of the live URL, not the server-render prop — two quick
    // filter changes would otherwise clobber each other.
    const current: Filters = {
      status: searchParams.get("status") ?? "",
      date: searchParams.get("date") ?? "",
      includePast: searchParams.get("past") === "1",
    };
    const merged = { ...current, ...next };
    const query = new URLSearchParams();
    if (merged.status) query.set("status", merged.status);
    if (merged.date) query.set("date", merged.date);
    if (merged.includePast) query.set("past", "1");
    const qs = query.toString();
    router.replace(qs ? `/admin?${qs}` : "/admin", { scroll: false });
  }

  async function setStatus(id: number, status: BookingStatus) {
    setBusyBooking(id);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setMessage(data?.error || "Could not update the booking.");
        return;
      }
      router.refresh();
    } catch {
      setMessage("Could not reach the server.");
    } finally {
      setBusyBooking(null);
    }
  }

  async function saveCapacity(e: React.FormEvent) {
    e.preventDefault();
    const value = Number.parseInt(capacityInput, 10);
    if (!Number.isInteger(value) || value < 0) {
      setMessage("Capacity must be a whole number of 0 or more.");
      return;
    }
    setSavingCapacity(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyCapacity: value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setMessage(data?.error || "Could not save the capacity.");
        return;
      }
      router.refresh();
    } catch {
      setMessage("Could not reach the server.");
    } finally {
      setSavingCapacity(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => null);
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-sand-50 pb-20">
      {/* Top bar */}
      <header className="border-b border-sand-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-display text-xl font-semibold">
              Oasis
            </Link>
            <span className="rounded-full bg-oasis-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-oasis-700">
              Admin
            </span>
          </div>
          <button
            onClick={logout}
            className="text-sm font-medium text-oasis-800 hover:text-oasis-600"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pt-8">
        {showPasswordWarning && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            <strong>Security note:</strong> the admin password is still the
            default. Set <code className="rounded bg-amber-100 px-1">ADMIN_PASSWORD</code>{" "}
            in your environment before going live.
          </div>
        )}

        {/* Stats + capacity */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-oasis-200/60">
            <p className="text-sm text-oasis-900/50">Pending requests</p>
            <p className="mt-1 font-display text-4xl font-semibold">
              {pendingCount}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-oasis-200/60">
            <p className="text-sm text-oasis-900/50">Guests today</p>
            <p className="mt-1 font-display text-4xl font-semibold">
              {guestsToday}
              <span className="text-xl text-oasis-900/40"> / {capacity}</span>
            </p>
          </div>
          <form
            onSubmit={saveCapacity}
            className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-oasis-200/60"
          >
            <label htmlFor="capacity" className="text-sm text-oasis-900/50">
              Daily capacity
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="capacity"
                type="number"
                min={0}
                max={10000}
                value={capacityInput}
                onChange={(e) => setCapacityInput(e.target.value)}
                className="w-24 rounded-xl border border-oasis-200 bg-sand-50 px-3 py-2 outline-none focus:border-oasis-500"
              />
              <button
                type="submit"
                disabled={savingCapacity || capacityInput === String(capacity)}
                className="rounded-xl bg-oasis-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-oasis-700 disabled:opacity-40"
              >
                {savingCapacity ? "Saving…" : "Save"}
              </button>
            </div>
            <p className="mt-2 text-xs text-oasis-900/40">
              Applies to every day. Lower it to limit guests.
            </p>
          </form>
        </div>

        {/* Next 14 days */}
        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold">Next 14 days</h2>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {summary.map((day) => {
              const full = day.remaining <= 0;
              const ratio = day.capacity > 0 ? day.booked / day.capacity : 1;
              return (
                <button
                  key={day.date}
                  onClick={() =>
                    applyFilters({ date: filters.date === day.date ? "" : day.date })
                  }
                  className={`min-w-32 shrink-0 rounded-2xl border p-4 text-left transition ${
                    filters.date === day.date
                      ? "border-oasis-600 bg-oasis-600 text-white"
                      : "border-oasis-200/60 bg-white hover:border-oasis-400"
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-60">
                    {day.date === today ? "Today" : formatDateShort(day.date)}
                  </p>
                  <p className="mt-2 font-display text-2xl font-semibold">
                    {day.booked}
                    <span className="text-sm opacity-50"> / {day.capacity}</span>
                  </p>
                  <p
                    className={`mt-1 text-xs ${
                      filters.date === day.date
                        ? "text-white/70"
                        : full
                          ? "text-blush-500"
                          : ratio > 0.8
                            ? "text-amber-600"
                            : "text-oasis-600"
                    }`}
                  >
                    {full ? "Full" : `${day.remaining} left`} · {day.price} JOD
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Bookings */}
        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-2xl font-semibold">Bookings</h2>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <select
                aria-label="Filter bookings by status"
                value={filters.status}
                onChange={(e) => applyFilters({ status: e.target.value })}
                className="rounded-xl border border-oasis-200 bg-white px-3 py-2 outline-none focus:border-oasis-500"
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <input
                type="date"
                aria-label="Filter bookings by day"
                value={filters.date}
                onChange={(e) => applyFilters({ date: e.target.value })}
                className="rounded-xl border border-oasis-200 bg-white px-3 py-2 outline-none focus:border-oasis-500"
              />
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.includePast}
                  onChange={(e) => applyFilters({ includePast: e.target.checked })}
                  className="h-4 w-4 accent-oasis-600"
                />
                Include past days
              </label>
            </div>
          </div>

          {message && (
            <p className="mt-4 rounded-xl bg-blush-100 px-4 py-3 text-sm text-blush-500">
              {message}
            </p>
          )}

          <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-oasis-200/60">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead>
                <tr className="border-b border-sand-200 text-xs uppercase tracking-wider text-oasis-900/50">
                  <th className="px-5 py-4">Ref</th>
                  <th className="px-5 py-4">Guest</th>
                  <th className="px-5 py-4">Day</th>
                  <th className="px-5 py-4">Guests</th>
                  <th className="px-5 py-4">Total</th>
                  <th className="px-5 py-4">Payment</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-oasis-900/40">
                      No bookings match these filters.
                    </td>
                  </tr>
                )}
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b border-sand-100 last:border-0">
                    <td className="px-5 py-4 font-semibold">
                      #{String(b.id).padStart(4, "0")}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium">{b.name}</p>
                      <p className="text-oasis-900/50">{b.phone}</p>
                      {b.email && <p className="text-oasis-900/50">{b.email}</p>}
                      {b.heard_about && (
                        <p className="mt-1 text-xs text-oasis-900/40">
                          via {b.heard_about}
                        </p>
                      )}
                      {b.notes && (
                        <p className="mt-1 max-w-60 text-xs italic text-oasis-900/40">
                          “{b.notes}”
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4">{formatDateLong(b.date)}</td>
                    <td className="px-5 py-4">{b.guests}</td>
                    <td className="px-5 py-4">
                      {b.total_price} JOD
                      <p className="text-xs text-oasis-900/40">
                        {b.price_per_guest} JOD each
                      </p>
                      {b.rate_type !== "standard" && (
                        <span
                          className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${RATE_BADGES[b.rate_type]}`}
                        >
                          {b.rate_type}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <PaymentEditor
                        booking={b}
                        onError={setMessage}
                        onSaved={() => {
                          setMessage("");
                          router.refresh();
                        }}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[b.status]}`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        {b.status !== "approved" && (
                          <button
                            onClick={() => setStatus(b.id, "approved")}
                            disabled={busyBooking === b.id}
                            className="rounded-full bg-oasis-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-oasis-700 disabled:opacity-40"
                          >
                            Approve
                          </button>
                        )}
                        {b.status !== "rejected" && (
                          <button
                            onClick={() => setStatus(b.id, "rejected")}
                            disabled={busyBooking === b.id}
                            className="rounded-full border border-blush-300 px-4 py-1.5 text-xs font-medium text-blush-500 transition hover:bg-blush-100 disabled:opacity-40"
                          >
                            Reject
                          </button>
                        )}
                        {b.status !== "pending" && (
                          <button
                            onClick={() => setStatus(b.id, "pending")}
                            disabled={busyBooking === b.id}
                            className="rounded-full border border-oasis-200 px-4 py-1.5 text-xs font-medium text-oasis-700 transition hover:bg-oasis-50 disabled:opacity-40"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
