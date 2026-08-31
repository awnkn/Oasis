"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  Booking,
  BookingStatus,
  DaySummary,
  GuestStatus,
  RateType,
} from "@/lib/bookings";
import { formatDateLong, formatDateShort, whenLabel } from "@/lib/dates";
import { NIGHT_SWIM_TIME } from "@/lib/config";
import {
  GUEST_STATUS_LABELS,
  PAYMENT_ACCOUNTS,
} from "@/lib/config";
import { bookingConfirmationText } from "@/lib/messages";
import type { StaffUser } from "@/lib/users";
import type { CustomerBadge } from "@/lib/customers";
import AddBookingModal from "@/components/AddBookingModal";
import AdminShell from "@/components/AdminShell";
import AssistantWidget from "@/components/AssistantWidget";
import EditBookingModal from "@/components/EditBookingModal";
import CustomerProfile from "@/components/CustomerProfile";
import CompAccessSection from "@/components/CompAccess";
import type { CompAccess, CompAccessSummary } from "@/lib/comp";

const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

// Booking-status badge colours (UX psychology: amber = awaiting action,
// green = go/approved, red = stopped/rejected).
const STATUS_STYLES: Record<BookingStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-600",
};

// Guest-status colour system. Each state reads at a glance:
//   open        → slate  (neutral, new / no action yet)
//   contacted   → blue   (informational, reached out / in progress)
//   follow up   → violet (flagged, needs chasing)
//   no response → amber  (caution, waiting on the guest)
//   confirmed   → green  (positive, they're coming)
//   checked in  → teal   (success, through the gate)
//   no show     → stone  (absent, booked but never arrived)
//   wrong num.  → zinc   (dead, unreachable contact)
//   cancelled   → red    (negative, spot released)
const GUEST_STATUS_COLOR: Record<
  GuestStatus,
  { dot: string; pill: string; select: string }
> = {
  open: { dot: "bg-slate-400", pill: "bg-slate-100 text-slate-600", select: "border-slate-200 bg-slate-50 text-slate-700" },
  contacted: { dot: "bg-sky-500", pill: "bg-sky-100 text-sky-700", select: "border-sky-200 bg-sky-50 text-sky-700" },
  follow_up: { dot: "bg-violet-500", pill: "bg-violet-100 text-violet-700", select: "border-violet-200 bg-violet-50 text-violet-700" },
  no_response: { dot: "bg-amber-500", pill: "bg-amber-100 text-amber-800", select: "border-amber-200 bg-amber-50 text-amber-800" },
  confirmed: { dot: "bg-emerald-500", pill: "bg-emerald-100 text-emerald-700", select: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  checked_in: { dot: "bg-teal-600", pill: "bg-teal-100 text-teal-700", select: "border-teal-200 bg-teal-50 text-teal-700" },
  no_show: { dot: "bg-stone-500", pill: "bg-stone-200 text-stone-700", select: "border-stone-300 bg-stone-100 text-stone-700" },
  wrong_number: { dot: "bg-zinc-400", pill: "bg-zinc-200 text-zinc-600", select: "border-zinc-300 bg-zinc-100 text-zinc-600" },
  cancelled: { dot: "bg-rose-500", pill: "bg-rose-100 text-rose-600", select: "border-rose-200 bg-rose-50 text-rose-600" },
  cancelled_no_response: { dot: "bg-rose-400", pill: "bg-rose-100 text-rose-600", select: "border-rose-200 bg-rose-50 text-rose-600" },
};

// States a person can pick in the guest-status dropdown.
const SELECTABLE_GUEST_STATUSES: GuestStatus[] = [
  "open",
  "contacted",
  "follow_up",
  "no_response",
  "confirmed",
  "no_show",
  "wrong_number",
  "cancelled",
];

const RATE_BADGES: Record<Exclude<RateType, "standard">, string> = {
  discounted: "bg-amber-100 text-amber-800",
  complimentary: "bg-rose-100 text-rose-600",
};

function pendingOf(b: Booking): number {
  return b.rate_type === "complimentary"
    ? 0
    : Math.max(0, b.total_price - (b.paid_amount ?? 0));
}

/** Pre-filled WhatsApp confirmation staff can send with one tap. */
function waLink(b: Booking): string {
  const text = bookingConfirmationText({
    firstName: b.name.split(" ")[0],
    reference: String(b.id).padStart(4, "0"),
    dateLong: whenLabel(b.date, b.session),
    guests: b.guests,
    total: b.total_price,
  });
  return `https://wa.me/${b.phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

// ---------- sorting ----------

type SortKey = "name" | "date" | "arrivals" | "paid" | "pending" | "status";
interface SortState {
  key: SortKey | null;
  dir: "asc" | "desc";
}

const GUEST_STATUS_ORDER: Record<GuestStatus, number> = {
  open: 0,
  contacted: 1,
  follow_up: 2,
  no_response: 3,
  confirmed: 4,
  checked_in: 5,
  no_show: 6,
  wrong_number: 7,
  cancelled: 8,
  cancelled_no_response: 9,
};

function sortBookings(list: Booking[], sort: SortState): Booking[] {
  if (!sort.key) return list;
  const key = sort.key;
  const factor = sort.dir === "asc" ? 1 : -1;
  return [...list].sort((a, b) => {
    let d = 0;
    switch (key) {
      case "name":
        d = a.name.localeCompare(b.name);
        break;
      case "date":
        d = a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
        break;
      case "arrivals":
        d = a.checked_in_count - b.checked_in_count;
        break;
      case "paid":
        d = (a.paid_amount ?? 0) - (b.paid_amount ?? 0);
        break;
      case "pending":
        d = pendingOf(a) - pendingOf(b);
        break;
      case "status":
        d = GUEST_STATUS_ORDER[a.guest_status] - GUEST_STATUS_ORDER[b.guest_status];
        break;
    }
    if (d === 0) d = a.id - b.id;
    return d * factor;
  });
}

const COLUMNS: { label: string; key: SortKey | null }[] = [
  { label: "Guest", key: "name" },
  { label: "Day", key: "date" },
  { label: "Arrivals", key: "arrivals" },
  { label: "Paid", key: "paid" },
  { label: "Pending", key: "pending" },
  { label: "Payment", key: null },
  { label: "Status", key: "status" },
  { label: "Actions", key: null },
];

function SortableHead({
  sort,
  onSort,
}: {
  sort: SortState;
  onSort: (key: SortKey) => void;
}) {
  return (
    <thead className="sticky top-0 z-10">
      <tr className="border-b border-zinc-200/70 bg-white text-[11px] uppercase tracking-wider text-zinc-400">
        {COLUMNS.map((c) => (
          <th
            key={c.label}
            className="bg-white px-4 py-3.5"
            aria-sort={
              c.key && sort.key === c.key
                ? sort.dir === "asc"
                  ? "ascending"
                  : "descending"
                : c.key
                  ? "none"
                  : undefined
            }
          >
            {c.key ? (
              <button
                onClick={() => onSort(c.key as SortKey)}
                className={`flex items-center gap-1 uppercase tracking-wider transition hover:text-zinc-700 ${
                  sort.key === c.key ? "text-oasis-600" : ""
                }`}
              >
                {c.label}
                <span className="text-[9px]">
                  {sort.key === c.key ? (sort.dir === "asc" ? "▲" : "▼") : "↕"}
                </span>
              </button>
            ) : (
              c.label
            )}
          </th>
        ))}
      </tr>
    </thead>
  );
}

// ---------- one editable booking row (shared by both views) ----------

interface RowCtx {
  busyBooking: number | null;
  patch: (id: number, body: Record<string, unknown>) => void;
  setStatus: (id: number, s: BookingStatus) => void;
  onEdit: (b: Booking) => void;
  onWhatsApp: (b: Booking) => void;
  waUsed: (b: Booking) => boolean;
  onError: (m: string) => void;
  onRefresh: () => void;
  badges: Record<string, CustomerBadge>;
  onProfile: (phone: string) => void;
}

/** Returning / VIP / New badge shown next to a guest's name. */
function CustomerBadgePill({ badge }: { badge?: CustomerBadge }) {
  if (badge?.vip) {
    return (
      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-300">
        ★ VIP
      </span>
    );
  }
  if (badge && badge.count >= 2) {
    return (
      <span className="rounded-full bg-oasis-100 px-1.5 py-0.5 text-[10px] font-semibold text-oasis-700">
        Returning
      </span>
    );
  }
  if (badge && badge.count === 1) {
    return (
      <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
        New
      </span>
    );
  }
  return null;
}

/** Options for the status dropdown; keeps a locked value (checked in /
 * cancelled — no response) visible but not re-selectable. */
function statusOptions(b: Booking): { value: GuestStatus; disabled?: boolean }[] {
  const base = SELECTABLE_GUEST_STATUSES.map((v) => ({ value: v }));
  if (!SELECTABLE_GUEST_STATUSES.includes(b.guest_status)) {
    return [{ value: b.guest_status, disabled: true }, ...base];
  }
  return base;
}

// Shared editable controls, used by both the desktop table row and the
// mobile card, so the two views can never drift apart.

function ArrivalsStepper({ b, ctx }: { b: Booking; ctx: RowCtx }) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <button
          aria-label="One guest left"
          onClick={() => ctx.patch(b.id, { checkedInCount: b.checked_in_count - 1 })}
          disabled={ctx.busyBooking === b.id || b.checked_in_count === 0}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-oasis-950/10 text-base text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-30"
        >
          −
        </button>
        <span
          className={`min-w-12 text-center text-sm font-semibold ${
            b.checked_in_count === b.guests
              ? "text-teal-600"
              : b.checked_in_count > 0
                ? "text-amber-600"
                : "text-zinc-400"
          }`}
        >
          {b.checked_in_count} / {b.guests}
        </span>
        <button
          aria-label="One guest arrived"
          onClick={() => ctx.patch(b.id, { checkedInCount: b.checked_in_count + 1 })}
          disabled={ctx.busyBooking === b.id || b.checked_in_count >= b.guests}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-oasis-950/10 text-base text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-30"
        >
          +
        </button>
      </div>
      <p className="mt-1 text-[11px] text-zinc-400">
        {b.checked_in_count === 0
          ? "no one in yet"
          : b.checked_in_count === b.guests
            ? "all in"
            : `${b.guests - b.checked_in_count} still expected`}
      </p>
    </div>
  );
}

function GuestStatusSelect({ b, ctx }: { b: Booking; ctx: RowCtx }) {
  return (
    <select
      aria-label={`Guest status for booking ${b.id}`}
      value={b.guest_status}
      disabled={ctx.busyBooking === b.id}
      onChange={(e) => ctx.patch(b.id, { guestStatus: e.target.value })}
      className={`rounded-lg border px-2 py-1.5 text-xs font-medium outline-none ${GUEST_STATUS_COLOR[b.guest_status].select}`}
    >
      {statusOptions(b).map((o) => (
        <option key={o.value} value={o.value} disabled={o.disabled}>
          {GUEST_STATUS_LABELS[o.value]}
        </option>
      ))}
    </select>
  );
}

function StatusPill({ b }: { b: Booking }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[b.status]}`}
    >
      {BOOKING_STATUS_LABELS[b.status]}
    </span>
  );
}

function ActionButtons({ b, ctx }: { b: Booking; ctx: RowCtx }) {
  const used = ctx.waUsed(b);
  return (
    <>
      {b.status === "approved" && b.checked_in_count < b.guests && (
        <button
          onClick={() => ctx.patch(b.id, { checkedInCount: b.guests })}
          disabled={ctx.busyBooking === b.id}
          className="rounded-full bg-oasis-900 px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-oasis-800 disabled:opacity-40"
        >
          All in
        </button>
      )}
      {b.status === "approved" && (
        <a
          href={waLink(b)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => ctx.onWhatsApp(b)}
          className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
            used
              ? "border border-emerald-500 bg-emerald-50 text-emerald-700"
              : "border border-oasis-950/10 text-oasis-700 hover:bg-oasis-50"
          }`}
        >
          {used ? "WhatsApp ✓" : "WhatsApp ↗"}
        </a>
      )}
      {b.status !== "approved" && (
        <button
          onClick={() => ctx.setStatus(b.id, "approved")}
          disabled={ctx.busyBooking === b.id}
          className="rounded-full bg-oasis-600 px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-oasis-700 disabled:opacity-40"
        >
          Approve
        </button>
      )}
      {b.status !== "rejected" && (
        <button
          onClick={() => ctx.setStatus(b.id, "rejected")}
          disabled={ctx.busyBooking === b.id}
          className="rounded-full border border-rose-300 px-3.5 py-1.5 text-xs font-medium text-rose-500 transition hover:bg-rose-50 disabled:opacity-40"
        >
          Reject
        </button>
      )}
      {b.status !== "pending" && (
        <button
          onClick={() => ctx.setStatus(b.id, "pending")}
          disabled={ctx.busyBooking === b.id}
          className="rounded-full border border-oasis-200 px-3.5 py-1.5 text-xs font-medium text-oasis-700 transition hover:bg-oasis-50 disabled:opacity-40"
        >
          Reset
        </button>
      )}
      <button
        onClick={() => ctx.onEdit(b)}
        disabled={ctx.busyBooking === b.id}
        className="rounded-full border border-oasis-950/10 px-3.5 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-40"
      >
        Edit
      </button>
    </>
  );
}

/** Desktop / wide-screen table row. */
function BookingRow({ b, ctx }: { b: Booking; ctx: RowCtx }) {
  const allIn = b.status === "approved" && b.checked_in_count >= b.guests;
  const pending = pendingOf(b);

  return (
    <tr className={`border-b border-zinc-100 last:border-0 ${allIn ? "bg-zinc-50/70" : ""}`}>
      {/* Guest */}
      <td className="px-4 py-3.5">
        <p className="text-xs text-zinc-400">#{String(b.id).padStart(4, "0")}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => ctx.onProfile(b.phone)}
            className="text-left font-medium transition hover:text-oasis-700 hover:underline"
          >
            {b.name}
          </button>
          <CustomerBadgePill badge={ctx.badges[b.phone]} />
        </div>
        <p className="text-xs text-zinc-500">{b.phone}</p>
        {b.email && <p className="text-xs text-zinc-500">{b.email}</p>}
        {b.heard_about && <p className="text-xs text-zinc-400">via {b.heard_about}</p>}
        {b.notes && (
          <p className="mt-0.5 max-w-44 text-xs italic text-zinc-400">“{b.notes}”</p>
        )}
      </td>

      {/* Day */}
      <td className="whitespace-nowrap px-4 py-3.5" title={formatDateLong(b.date)}>
        {formatDateShort(b.date)}
        {b.session === "night" && (
          <span
            className="mt-1 block w-fit rounded-full bg-oasis-950 px-2 py-0.5 text-[10px] font-semibold text-white"
            title={`Night swim · ${NIGHT_SWIM_TIME}`}
          >
            🌙 Night
          </span>
        )}
      </td>

      {/* Arrivals */}
      <td className="px-4 py-3.5">
        {b.status === "approved" ? (
          <ArrivalsStepper b={b} ctx={ctx} />
        ) : (
          <span className="text-sm text-zinc-400">{b.guests} booked</span>
        )}
      </td>

      {/* Paid */}
      <td className="whitespace-nowrap px-4 py-3.5">
        <p className={`font-semibold ${(b.paid_amount ?? 0) > 0 ? "text-emerald-600" : "text-zinc-400"}`}>
          {b.paid_amount ?? 0} JOD
        </p>
        {(b.paid_amount ?? 0) > 0 && b.paid_account && (
          <p className="text-xs text-zinc-400">via {b.paid_account}</p>
        )}
      </td>

      {/* Pending */}
      <td className="whitespace-nowrap px-4 py-3.5">
        <p className={`font-semibold ${pending > 0 ? "text-amber-600" : "text-zinc-400"}`}>
          {pending} JOD
        </p>
        <p className="text-xs text-zinc-400">
          of {b.total_price} · {b.price_per_guest} each
        </p>
        {b.rate_type !== "standard" && (
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${RATE_BADGES[b.rate_type]}`}
          >
            {b.rate_type}
          </span>
        )}
      </td>

      {/* Payment editor */}
      <td className="px-4 py-3.5">
        <PaymentEditor booking={b} onError={ctx.onError} onSaved={ctx.onRefresh} />
      </td>

      {/* Status */}
      <td className="px-4 py-3.5">
        <div className="flex flex-col items-start gap-1.5">
          <StatusPill b={b} />
          <GuestStatusSelect b={b} ctx={ctx} />
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-3.5">
        <div className="flex max-w-36 flex-wrap gap-1.5">
          <ActionButtons b={b} ctx={ctx} />
        </div>
      </td>
    </tr>
  );
}

/** Phone / tablet card — the same booking, laid out to stack cleanly. */
function BookingCard({ b, ctx }: { b: Booking; ctx: RowCtx }) {
  const pending = pendingOf(b);

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      {/* Guest + booking status */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-zinc-400">#{String(b.id).padStart(4, "0")}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => ctx.onProfile(b.phone)}
              className="text-left font-semibold transition hover:text-oasis-700 hover:underline"
            >
              {b.name}
            </button>
            <CustomerBadgePill badge={ctx.badges[b.phone]} />
          </div>
          <p className="text-xs text-zinc-500">{b.phone}</p>
          {b.email && <p className="break-all text-xs text-zinc-500">{b.email}</p>}
          {b.heard_about && <p className="text-xs text-zinc-400">via {b.heard_about}</p>}
          {b.notes && <p className="mt-0.5 text-xs italic text-zinc-400">“{b.notes}”</p>}
        </div>
        <StatusPill b={b} />
      </div>

      {/* Day · Paid · Pending */}
      <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-zinc-50 px-3 py-2.5">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-400">Day</p>
          <p className="text-sm font-medium" title={formatDateLong(b.date)}>
            {formatDateShort(b.date)}
          </p>
          {b.session === "night" && (
            <span className="mt-1 inline-block rounded-full bg-oasis-950 px-2 py-0.5 text-[10px] font-semibold text-white">
              🌙 Night
            </span>
          )}
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-400">Paid</p>
          <p className={`text-sm font-semibold ${(b.paid_amount ?? 0) > 0 ? "text-emerald-600" : "text-zinc-400"}`}>
            {b.paid_amount ?? 0} JOD
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-400">Pending</p>
          <p className={`text-sm font-semibold ${pending > 0 ? "text-amber-600" : "text-zinc-400"}`}>
            {pending} JOD
          </p>
        </div>
      </div>

      {/* Arrivals */}
      <div className="mt-3">
        <p className="mb-1 text-[11px] uppercase tracking-wide text-zinc-400">Arrivals</p>
        {b.status === "approved" ? (
          <ArrivalsStepper b={b} ctx={ctx} />
        ) : (
          <p className="text-sm text-zinc-400">{b.guests} guests booked</p>
        )}
      </div>

      {/* Payment editor */}
      <div className="mt-3 border-t border-zinc-100 pt-3">
        <p className="mb-1.5 text-[11px] uppercase tracking-wide text-zinc-400">Payment</p>
        <PaymentEditor booking={b} onError={ctx.onError} onSaved={ctx.onRefresh} />
      </div>

      {/* Guest status */}
      <div className="mt-3 border-t border-zinc-100 pt-3">
        <p className="mb-1.5 text-[11px] uppercase tracking-wide text-zinc-400">Guest status</p>
        <GuestStatusSelect b={b} ctx={ctx} />
      </div>

      {/* Actions */}
      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-zinc-100 pt-3">
        <ActionButtons b={b} ctx={ctx} />
      </div>
    </div>
  );
}

// ---------- grouped-by-status view (same editable layout) ----------

function BookingsByStatus({
  bookings,
  ctx,
  sort,
  onSort,
}: {
  bookings: Booking[];
  ctx: RowCtx;
  sort: SortState;
  onSort: (k: SortKey) => void;
}) {
  const [openGroups, setOpenGroups] = useState<Partial<Record<GuestStatus, boolean>>>({});

  const groups = (Object.keys(GUEST_STATUS_LABELS) as GuestStatus[]).map((s) => ({
    status: s,
    items: bookings.filter((b) => b.guest_status === s),
  }));

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold tracking-tight">Bookings by status</h2>
      <p className="mt-1 text-sm text-zinc-500">
        The same bookings, grouped by status and fully editable here too. Click a
        status to open it; the filters, search and sorting above apply here.
      </p>

      <div className="mt-4 max-h-[75vh] space-y-2 overflow-y-auto pr-1">
        {groups.map(({ status, items }) => {
          const guests = items.reduce((sum, b) => sum + b.guests, 0);
          const isOpen = openGroups[status] === true && items.length > 0;
          const c = GUEST_STATUS_COLOR[status];
          return (
            <div key={status} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              <button
                onClick={() => setOpenGroups((g) => ({ ...g, [status]: !g[status] }))}
                disabled={items.length === 0}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between px-5 py-3.5 text-left transition enabled:hover:bg-zinc-50 disabled:cursor-default"
              >
                <span className="flex items-center gap-2.5">
                  <span className={`h-2 w-2 rounded-full ${c.dot}`} />
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.pill}`}>
                    {GUEST_STATUS_LABELS[status]}
                  </span>
                  <span className="text-sm text-zinc-400">
                    {items.length === 0
                      ? "none"
                      : `${items.length} ${items.length === 1 ? "booking" : "bookings"} · ${guests} ${guests === 1 ? "guest" : "guests"}`}
                  </span>
                </span>
                {items.length > 0 && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                    className={`shrink-0 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  >
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>

              {isOpen && (
                <div className="border-t border-zinc-100">
                  {/* Desktop table */}
                  <div className="hidden overflow-x-auto lg:block">
                    <table className="w-full text-left text-sm">
                      <SortableHead sort={sort} onSort={onSort} />
                      <tbody className="align-top">
                        {items.map((b) => (
                          <BookingRow key={b.id} b={b} ctx={ctx} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Mobile / tablet cards */}
                  <div className="space-y-3 bg-zinc-50/60 p-3 lg:hidden">
                    {items.map((b) => (
                      <BookingCard key={b.id} b={b} ctx={ctx} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---------- team management (unchanged) ----------

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
      <h2 className="text-lg font-semibold tracking-tight">Team &amp; access</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Each person signs in with their own name and password. Staff manage
        bookings and payments; managers also control capacity, insights and this
        team list. Every action is recorded under their name.
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
                    onChange={(e) => call(`/api/admin/users/${u.id}`, "PATCH", { role: e.target.value })}
                    className="rounded-lg border border-oasis-950/10 bg-white px-2 py-1.5 text-xs outline-none focus:border-oasis-950/25"
                  >
                    <option value="staff">Staff — bookings &amp; payments</option>
                    <option value="manager">Manager — full access</option>
                  </select>
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      u.active ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600"
                    }`}
                  >
                    {u.active ? "Active" : "Disabled"}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      disabled={busy}
                      onClick={() => call(`/api/admin/users/${u.id}`, "PATCH", { active: !u.active })}
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
                            if (await call(`/api/admin/users/${u.id}`, "PATCH", { password: newPassword })) {
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
          <label htmlFor="new-member-name" className="mb-1 block text-xs font-medium text-zinc-500">Name</label>
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
          <label htmlFor="new-member-password" className="mb-1 block text-xs font-medium text-zinc-500">Password</label>
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
          <label htmlFor="new-member-role" className="mb-1 block text-xs font-medium text-zinc-500">Access</label>
          <select
            id="new-member-role"
            value={role}
            onChange={(e) => setRole(e.target.value as "staff" | "manager")}
            className="rounded-xl border border-oasis-950/10 bg-white px-3 py-2 text-sm outline-none focus:border-oasis-950/25"
          >
            <option value="staff">Staff — bookings &amp; payments</option>
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

// ---------- payment editor (unchanged behaviour) ----------

function PaymentEditor({
  booking,
  onError,
  onSaved,
}: {
  booking: Booking;
  onError: (message: string) => void;
  onSaved: () => void;
}) {
  const propPaid = booking.paid_amount === null ? "" : String(booking.paid_amount);
  const propAccount = booking.paid_account ?? booking.payment_method ?? "Cash";
  const [rate, setRate] = useState<RateType>(booking.rate_type);
  const [paid, setPaid] = useState(propPaid);
  const [account, setAccount] = useState(propAccount);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRate(booking.rate_type);
    setPaid(booking.paid_amount === null ? "" : String(booking.paid_amount));
    setAccount(booking.paid_account ?? booking.payment_method ?? "Cash");
  }, [booking.rate_type, booking.paid_amount, booking.paid_account, booking.payment_method]);

  const dirty = rate !== booking.rate_type || paid !== propPaid || account !== propAccount;

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
    <div className="flex flex-col items-start gap-1.5">
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
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>
      {booking.payment_method && (
        <p className="text-xs text-zinc-400">Guest chose {booking.payment_method}</p>
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
  guestStatus: string;
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
  badges,
  compSummary,
  compEntries,
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
  badges: Record<string, CustomerBadge>;
  compSummary: CompAccessSummary;
  compEntries: CompAccess[];
  showPasswordWarning: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [capacityInput, setCapacityInput] = useState(String(capacity));
  const [savingCapacity, setSavingCapacity] = useState(false);
  const [busyBooking, setBusyBooking] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [searchInput, setSearchInput] = useState(filters.query);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [sort, setSort] = useState<SortState>({ key: null, dir: "asc" });
  const [waClicked, setWaClicked] = useState<Set<number>>(new Set());
  const [profilePhone, setProfilePhone] = useState<string | null>(null);

  useEffect(() => {
    if (searchInput === filters.query) return;
    const timer = setTimeout(() => applyFilters({ query: searchInput }), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, filters.query]);

  useEffect(() => {
    setCapacityInput(String(capacity));
  }, [capacity]);

  const sortedBookings = useMemo(() => sortBookings(bookings, sort), [bookings, sort]);

  function onSort(key: SortKey) {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );
  }

  function applyFilters(next: Partial<Filters>) {
    const current: Filters = {
      status: searchParams.get("status") ?? "",
      guestStatus: searchParams.get("gs") ?? "",
      date: searchParams.get("date") ?? "",
      includePast: searchParams.get("past") === "1",
      query: searchParams.get("q") ?? "",
    };
    const merged = { ...current, ...next };
    const query = new URLSearchParams();
    if (merged.status) query.set("status", merged.status);
    if (merged.guestStatus) query.set("gs", merged.guestStatus);
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

  // Opening WhatsApp marks the button "used" and moves an untouched guest
  // straight to "Contacted" (without downgrading a further-along status).
  function onWhatsApp(b: Booking) {
    setWaClicked((prev) => new Set(prev).add(b.id));
    if (b.guest_status === "open" || b.guest_status === "no_response") {
      patchBooking(b.id, { guestStatus: "contacted" });
    }
  }

  function waUsed(b: Booking): boolean {
    return (
      waClicked.has(b.id) ||
      b.guest_status === "contacted" ||
      b.guest_status === "confirmed" ||
      b.guest_status === "checked_in"
    );
  }

  const ctx: RowCtx = {
    busyBooking,
    patch: patchBooking,
    setStatus,
    onEdit: setEditing,
    onWhatsApp,
    waUsed,
    onError: setMessage,
    onRefresh: () => {
      setMessage("");
      router.refresh();
    },
    badges,
    onProfile: setProfilePhone,
  };

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

  return (
    <AdminShell role={role}>
        {showPasswordWarning && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            <strong>Security note:</strong> the admin password is still the default.
            Set <code className="rounded bg-amber-100 px-1">ADMIN_PASSWORD</code> in
            your environment before going live.
          </div>
        )}

        {/* Stats + capacity */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-6">
            <p className="text-sm text-zinc-500">Pending requests</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{pendingCount}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-6">
            <p className="text-sm text-zinc-500">Bookings today</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{bookingsToday}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-6">
            <p className="text-sm text-zinc-500">Guests today</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              {guestsToday}
              <span className="text-lg text-zinc-400 sm:text-xl"> / {capacity}</span>
            </p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-6">
            <p className="text-sm text-zinc-500">Checked in today</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-teal-600 sm:text-3xl">
              {checkedInToday}
              <span className="text-lg text-zinc-400 sm:text-xl"> / {guestsToday}</span>
            </p>
          </div>
          {role === "manager" ? (
            <form onSubmit={saveCapacity} className="col-span-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-6 lg:col-span-1">
              <label htmlFor="capacity" className="text-sm text-zinc-500">Daily capacity</label>
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
              <p className="mt-2 text-xs text-zinc-400">Applies to every day. Lower it to limit guests.</p>
            </form>
          ) : (
            <div className="col-span-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-6 lg:col-span-1">
              <p className="text-sm text-zinc-500">Daily capacity</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{capacity}</p>
              <p className="mt-2 text-xs text-zinc-400">Set by the manager.</p>
            </div>
          )}
        </div>

        {/* Next 14 days */}
        <section className="mt-8 sm:mt-10">
          <h2 className="text-lg font-semibold tracking-tight">Next 14 days</h2>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {summary.map((day) => {
              const full = day.remaining <= 0;
              const ratio = day.capacity > 0 ? day.booked / day.capacity : 1;
              return (
                <button
                  key={day.date}
                  onClick={() => applyFilters({ date: filters.date === day.date ? "" : day.date })}
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
                          ? "text-rose-500"
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
        <section className="mt-8 sm:mt-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight">Bookings</h2>
              <button
                onClick={() => setShowAdd(true)}
                className="rounded-full bg-oasis-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-oasis-800 sm:hidden"
              >
                + Add
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm sm:flex sm:flex-wrap sm:items-center sm:gap-3">
              <button
                onClick={() => setShowAdd(true)}
                className="hidden rounded-full bg-oasis-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-oasis-800 sm:inline-block"
              >
                + Add booking
              </button>
              <input
                type="search"
                aria-label="Search bookings by name or phone"
                placeholder="Search name or phone…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="col-span-2 rounded-xl border border-oasis-950/10 bg-white px-3 py-2 outline-none transition focus:border-oasis-950/25 focus:ring-4 focus:ring-oasis-500/10 sm:w-52"
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
              <select
                aria-label="Filter bookings by guest status"
                value={filters.guestStatus}
                onChange={(e) => applyFilters({ guestStatus: e.target.value })}
                className="rounded-xl border border-oasis-950/10 bg-white px-3 py-2 outline-none focus:border-oasis-500"
              >
                <option value="">All guest statuses</option>
                {(Object.keys(GUEST_STATUS_LABELS) as GuestStatus[]).map((s) => (
                  <option key={s} value={s}>{GUEST_STATUS_LABELS[s]}</option>
                ))}
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
            <p className="mt-4 rounded-xl bg-rose-100 px-4 py-3 text-sm text-rose-600">{message}</p>
          )}

          {/* Desktop / wide table */}
          <div className="mt-4 hidden max-h-[65vh] overflow-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5 lg:block">
            <table className="w-full text-left text-sm">
              <SortableHead sort={sort} onSort={onSort} />
              <tbody className="align-top">
                {sortedBookings.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-zinc-400">
                      No bookings match these filters.
                    </td>
                  </tr>
                )}
                {sortedBookings.map((b) => (
                  <BookingRow key={b.id} b={b} ctx={ctx} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Phone / tablet cards */}
          <div className="mt-4 space-y-3 lg:hidden">
            {sortedBookings.length === 0 && (
              <div className="rounded-2xl bg-white px-4 py-12 text-center text-zinc-400 shadow-sm ring-1 ring-black/5">
                No bookings match these filters.
              </div>
            )}
            {sortedBookings.map((b) => (
              <BookingCard key={b.id} b={b} ctx={ctx} />
            ))}
          </div>
        </section>

        <BookingsByStatus bookings={sortedBookings} ctx={ctx} sort={sort} onSort={onSort} />

        <CompAccessSection today={today} summary={compSummary} entries={compEntries} />

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

      <AddBookingModal
        open={showAdd}
        today={today}
        onClose={() => setShowAdd(false)}
        onSaved={() => {
          setShowAdd(false);
          setMessage("");
          router.refresh();
        }}
      />
      <EditBookingModal
        booking={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          setMessage("");
          router.refresh();
        }}
      />
      <CustomerProfile
        phone={profilePhone}
        onClose={() => setProfilePhone(null)}
        onSaved={() => router.refresh()}
      />
      <AssistantWidget />
    </AdminShell>
  );
}
