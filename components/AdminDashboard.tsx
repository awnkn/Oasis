"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  Booking,
  BookingStatus,
  DaySummary,
  GuestStatus,
  RateType,
} from "@/lib/bookings";
import { formatDateLong, formatDateShort } from "@/lib/dates";
import {
  CLUB_NAME,
  GUEST_STATUS_LABELS,
  PAYMENT_ACCOUNTS,
} from "@/lib/config";

const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pending",
  approved: "Booking approved",
  rejected: "Rejected",
};

// Staff-selectable guest statuses ("checked in" via the button,
// "cancelled — no response" only via the automatic 24h sweep).
const SELECTABLE_GUEST_STATUSES: GuestStatus[] = [
  "open",
  "contacted",
  "no_response",
  "confirmed",
  "cancelled",
];

const GUEST_STATUS_STYLES: Partial<Record<GuestStatus, string>> = {
  checked_in: "bg-oasis-100 text-oasis-700",
  cancelled: "bg-blush-100 text-blush-500",
  cancelled_no_response: "bg-blush-100 text-blush-500",
};
import type { StaffUser } from "@/lib/users";

/** Pre-filled WhatsApp confirmation staff can send with one tap. */
function waLink(b: Booking): string {
  const text =
    `Dear ${b.name.split(" ")[0]}, your ${CLUB_NAME} booking is confirmed! ` +
    `Reference #${String(b.id).padStart(4, "0")} · ${formatDateLong(b.date)} · ` +
    `${b.guests} ${b.guests === 1 ? "guest" : "guests"} · ` +
    `${b.total_price} JOD payable at the gate. We can't wait to welcome you 🌸`;
  return `https://wa.me/${b.phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

function TeamSection({
  team,
  onError,
  onSaved,
}: {
  team: StaffUser[];
  onError: (m: string) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"staff" | "manager">("staff");
  const [busy, setBusy] = useState(false);
  const [resettingId, setResettingId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");

  async function call(url: string, method: string, body: unknown) {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        onError(data?.error || "Could not update the team.");
        return false;
      }
      onSaved();
      return true;
    } catch {
      onError("Could not reach the server.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold tracking-tight">Team & access</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Each person signs in with their own name and password. Staff manage
        bookings and payments; managers also control capacity, insights and
        this team list. Every action is recorded under their name.
      </p>

      <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-oasis-950/5">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200/70 text-xs uppercase tracking-wider text-zinc-500">
              <th className="px-5 py-3.5">Name</th>
              <th className="px-5 py-3.5">Access</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {team.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-zinc-400">
                  No team accounts yet — add your first below.
                </td>
              </tr>
            )}
            {team.map((u) => (
              <tr key={u.id} className="border-b border-zinc-100 last:border-0">
                <td className="px-5 py-3 font-medium">{u.name}</td>
                <td className="px-5 py-3">
                  <select
                    aria-label={`Role for ${u.name}`}
                    value={u.role}
                    disabled={busy}
                    onChange={(e) =>
                      call(`/api/admin/users/${u.id}`, "PATCH", { role: e.target.value })
                    }
                    className="rounded-lg border border-oasis-950/10 bg-white px-2 py-1.5 text-xs outline-none focus:border-oasis-950/25"
                  >
                    <option value="staff">Staff — bookings & payments</option>
                    <option value="manager">Manager — full access</option>
                  </select>
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      u.active ? "bg-oasis-100 text-oasis-700" : "bg-blush-100 text-blush-500"
                    }`}
                  >
                    {u.active ? "Active" : "Disabled"}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      disabled={busy}
                      onClick={() =>
                        call(`/api/admin/users/${u.id}`, "PATCH", { active: !u.active })
                      }
                      className="rounded-full border border-oasis-950/10 px-4 py-1.5 text-xs font-medium text-oasis-700 transition hover:bg-oasis-50 disabled:opacity-40"
                    >
                      {u.active ? "Disable" : "Enable"}
                    </button>
                    {resettingId === u.id ? (
                      <span className="flex items-center gap-1.5">
                        <input
                          type="password"
                          autoFocus
                          placeholder="New password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-32 rounded-lg border border-oasis-950/10 bg-white px-2 py-1.5 text-xs outline-none focus:border-oasis-950/25"
                        />
                        <button
                          disabled={busy || newPassword.length < 6}
                          onClick={async () => {
                            if (
                              await call(`/api/admin/users/${u.id}`, "PATCH", {
                                password: newPassword,
                              })
                            ) {
                              setResettingId(null);
                              setNewPassword("");
                            }
                          }}
                          className="rounded-full bg-oasis-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setResettingId(null);
                            setNewPassword("");
                          }}
                          className="text-xs text-zinc-500 hover:text-oasis-900"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        disabled={busy}
                        onClick={() => setResettingId(u.id)}
                        className="rounded-full border border-oasis-950/10 px-4 py-1.5 text-xs font-medium text-oasis-700 transition hover:bg-oasis-50 disabled:opacity-40"
                      >
                        Reset password
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (await call("/api/admin/users", "POST", { name, password, role })) {
            setName("");
            setPassword("");
            setRole("staff");
          }
        }}
        className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-oasis-950/5"
      >
        <div>
          <label htmlFor="new-member-name" className="mb-1 block text-xs font-medium text-zinc-500">
            Name
          </label>
          <input
            id="new-member-name"
            required
            minLength={2}
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Salma"
            className="w-40 rounded-xl border border-oasis-950/10 bg-white px-3 py-2 text-sm outline-none focus:border-oasis-950/25"
          />
        </div>
        <div>
          <label htmlFor="new-member-password" className="mb-1 block text-xs font-medium text-zinc-500">
            Password
          </label>
          <input
            id="new-member-password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 6 characters"
            className="w-40 rounded-xl border border-oasis-950/10 bg-white px-3 py-2 text-sm outline-none focus:border-oasis-950/25"
          />
        </div>
        <div>
          <label htmlFor="new-member-role" className="mb-1 block text-xs font-medium text-zinc-500">
            Access
          </label>
          <select
            id="new-member-role"
            value={role}
            onChange={(e) => setRole(e.target.value as "staff" | "manager")}
            className="rounded-xl border border-oasis-950/10 bg-white px-3 py-2 text-sm outline-none focus:border-oasis-950/25"
          >
            <option value="staff">Staff — bookings & payments</option>
            <option value="manager">Manager — full access</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-oasis-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-oasis-700 disabled:opacity-40"
        >
          Add team member
        </button>
      </form>
    </section>
  );
}

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
  const propAccount =
    booking.paid_account ?? booking.payment_method ?? "Cash";
  const [rate, setRate] = useState<RateType>(booking.rate_type);
  const [paid, setPaid] = useState(propPaid);
  const [account, setAccount] = useState(propAccount);
  const [saving, setSaving] = useState(false);

  // Resync after a refresh brings new server values.
  useEffect(() => {
    setRate(booking.rate_type);
    setPaid(booking.paid_amount === null ? "" : String(booking.paid_amount));
    setAccount(booking.paid_account ?? booking.payment_method ?? "Cash");
  }, [booking.rate_type, booking.paid_amount, booking.paid_account, booking.payment_method]);

  const dirty =
    rate !== booking.rate_type || paid !== propPaid || account !== propAccount;

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
        body: JSON.stringify({
          rateType: rate,
          paidAmount: amount,
          paidAccount: amount === null ? null : account,
        }),
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
        className="w-36 rounded-lg border border-oasis-950/10 bg-white px-2 py-1.5 text-xs outline-none focus:border-oasis-500"
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
          className="w-20 rounded-lg border border-oasis-950/10 bg-white px-2 py-1.5 text-xs outline-none focus:border-oasis-500"
        />
        <span className="text-xs text-zinc-500">JOD via</span>
        <select
          aria-label={`Account for booking ${booking.id}`}
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          className="rounded-lg border border-oasis-950/10 bg-white px-1.5 py-1.5 text-xs outline-none focus:border-oasis-500"
        >
          {PAYMENT_ACCOUNTS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>
      {booking.payment_method && (
        <p className="text-xs text-zinc-400">
          Guest chose {booking.payment_method}
        </p>
      )}
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
  query: string;
}

export default function AdminDashboard({
  bookings,
  capacity,
  summary,
  pendingCount,
  guestsToday,
  bookingsToday,
  checkedInToday,
  today,
  filters,
  role,
  team,
  showPasswordWarning,
}: {
  bookings: Booking[];
  capacity: number;
  summary: DaySummary[];
  pendingCount: number;
  guestsToday: number;
  bookingsToday: number;
  checkedInToday: number;
  today: string;
  filters: Filters;
  role: "manager" | "staff";
  team: StaffUser[];
  showPasswordWarning: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [capacityInput, setCapacityInput] = useState(String(capacity));
  const [savingCapacity, setSavingCapacity] = useState(false);
  const [busyBooking, setBusyBooking] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [searchInput, setSearchInput] = useState(filters.query);

  // Debounced client search → URL param → server-filtered list.
  useEffect(() => {
    if (searchInput === filters.query) return;
    const timer = setTimeout(() => applyFilters({ query: searchInput }), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, filters.query]);

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
      query: searchParams.get("q") ?? "",
    };
    const merged = { ...current, ...next };
    const query = new URLSearchParams();
    if (merged.status) query.set("status", merged.status);
    if (merged.date) query.set("date", merged.date);
    if (merged.includePast) query.set("past", "1");
    if (merged.query) query.set("q", merged.query);
    const qs = query.toString();
    router.replace(qs ? `/admin?${qs}` : "/admin", { scroll: false });
  }

  async function patchBooking(id: number, body: Record<string, unknown>) {
    setBusyBooking(id);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  function setStatus(id: number, status: BookingStatus) {
    return patchBooking(id, { status });
  }

  function setCheckedIn(id: number, checkedIn: boolean) {
    return patchBooking(id, { checkedIn });
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
    <div className="min-h-screen bg-zinc-50 pb-20">
      {/* Top bar */}
      <header className="border-b border-zinc-200/70 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-base font-semibold tracking-tight">
              Oasis
            </Link>
            <span className="rounded-full bg-oasis-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-oasis-700">
              {role === "manager" ? "Manager" : "Staff"}
            </span>
          </div>
          <div className="flex items-center gap-5">
            {role === "manager" && (
              <Link
                href="/admin/insights"
                className="rounded-full bg-oasis-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-oasis-700"
              >
                Insights & accounting
              </Link>
            )}
            <button
              onClick={logout}
              className="text-sm font-medium text-oasis-800 hover:text-oasis-600"
            >
              Sign out
            </button>
          </div>
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <p className="text-sm text-zinc-500">Pending requests</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">
              {pendingCount}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <p className="text-sm text-zinc-500">Bookings today</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">
              {bookingsToday}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <p className="text-sm text-zinc-500">Guests today</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">
              {guestsToday}
              <span className="text-xl text-zinc-400"> / {capacity}</span>
            </p>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <p className="text-sm text-zinc-500">Checked in today</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-oasis-600">
              {checkedInToday}
              <span className="text-xl text-zinc-400"> / {guestsToday}</span>
            </p>
          </div>
          {role === "manager" ? (
            <form
              onSubmit={saveCapacity}
              className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5"
            >
              <label htmlFor="capacity" className="text-sm text-zinc-500">
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
                  className="w-24 rounded-xl border border-oasis-950/10 bg-white px-3 py-2 outline-none focus:border-oasis-500"
                />
                <button
                  type="submit"
                  disabled={savingCapacity || capacityInput === String(capacity)}
                  className="rounded-xl bg-oasis-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-oasis-700 disabled:opacity-40"
                >
                  {savingCapacity ? "Saving…" : "Save"}
                </button>
              </div>
              <p className="mt-2 text-xs text-zinc-400">
                Applies to every day. Lower it to limit guests.
              </p>
            </form>
          ) : (
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
              <p className="text-sm text-zinc-500">Daily capacity</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight">{capacity}</p>
              <p className="mt-2 text-xs text-zinc-400">
                Set by the manager.
              </p>
            </div>
          )}
        </div>

        {/* Next 14 days */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight">Next 14 days</h2>
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
                  <p className="mt-2 text-lg font-semibold tracking-tight">
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
            <h2 className="text-lg font-semibold tracking-tight">Bookings</h2>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <input
                type="search"
                aria-label="Search bookings by name or phone"
                placeholder="Search name or phone…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-52 rounded-xl border border-oasis-950/10 bg-white px-3 py-2 outline-none transition focus:border-oasis-950/25 focus:ring-4 focus:ring-oasis-500/10"
              />
              <select
                aria-label="Filter bookings by status"
                value={filters.status}
                onChange={(e) => applyFilters({ status: e.target.value })}
                className="rounded-xl border border-oasis-950/10 bg-white px-3 py-2 outline-none focus:border-oasis-500"
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
                className="rounded-xl border border-oasis-950/10 bg-white px-3 py-2 outline-none focus:border-oasis-500"
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

          <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
            <table className="w-full min-w-[1220px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200/70 text-xs uppercase tracking-wider text-zinc-500">
                  <th className="px-5 py-4">Ref</th>
                  <th className="px-5 py-4">Guest</th>
                  <th className="px-5 py-4">Day</th>
                  <th className="px-5 py-4">Guests</th>
                  <th className="px-5 py-4">Total</th>
                  <th className="px-5 py-4">Payment</th>
                  <th className="px-5 py-4">Booking status</th>
                  <th className="px-5 py-4">Guest status</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-zinc-400">
                      No bookings match these filters.
                    </td>
                  </tr>
                )}
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b border-zinc-100 last:border-0">
                    <td className="px-5 py-4 font-semibold">
                      #{String(b.id).padStart(4, "0")}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium">{b.name}</p>
                      <p className="text-zinc-500">{b.phone}</p>
                      {b.email && <p className="text-zinc-500">{b.email}</p>}
                      {b.heard_about && (
                        <p className="mt-1 text-xs text-zinc-400">
                          via {b.heard_about}
                        </p>
                      )}
                      {b.notes && (
                        <p className="mt-1 max-w-60 text-xs italic text-zinc-400">
                          “{b.notes}”
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4">{formatDateLong(b.date)}</td>
                    <td className="px-5 py-4">{b.guests}</td>
                    <td className="px-5 py-4">
                      {b.total_price} JOD
                      <p className="text-xs text-zinc-400">
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
                        className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[b.status]}`}
                      >
                        {BOOKING_STATUS_LABELS[b.status]}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {b.guest_status === "checked_in" ||
                      b.guest_status === "cancelled_no_response" ? (
                        <span
                          className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${GUEST_STATUS_STYLES[b.guest_status]}`}
                        >
                          {GUEST_STATUS_LABELS[b.guest_status]}
                        </span>
                      ) : (
                        <select
                          aria-label={`Guest status for booking ${b.id}`}
                          value={b.guest_status}
                          disabled={busyBooking === b.id}
                          onChange={(e) =>
                            patchBooking(b.id, { guestStatus: e.target.value })
                          }
                          className="rounded-lg border border-oasis-950/10 bg-white px-2 py-1.5 text-xs outline-none focus:border-oasis-950/25"
                        >
                          {SELECTABLE_GUEST_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {GUEST_STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        {b.status === "approved" &&
                          b.guest_status !== "checked_in" && (
                            <button
                              onClick={() => setCheckedIn(b.id, true)}
                              disabled={busyBooking === b.id}
                              className="rounded-full bg-oasis-900 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-oasis-800 disabled:opacity-40"
                            >
                              Check in
                            </button>
                          )}
                        {b.guest_status === "checked_in" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-oasis-100 px-3 py-1.5 text-xs font-semibold text-oasis-700">
                            ✓ Checked in
                            {role === "manager" && (
                              <button
                                onClick={() => setCheckedIn(b.id, false)}
                                disabled={busyBooking === b.id}
                                className="ml-1 text-oasis-700/60 underline hover:text-oasis-700"
                              >
                                undo
                              </button>
                            )}
                          </span>
                        )}
                        {b.status === "approved" && (
                          <a
                            href={waLink(b)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-full border border-oasis-950/10 px-4 py-1.5 text-xs font-medium text-oasis-700 transition hover:bg-oasis-50"
                          >
                            WhatsApp ↗
                          </a>
                        )}
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

        {role === "manager" && (
          <TeamSection
            team={team}
            onError={setMessage}
            onSaved={() => {
              setMessage("");
              router.refresh();
            }}
          />
        )}
      </main>
    </div>
  );
}
