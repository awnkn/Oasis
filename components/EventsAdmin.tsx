"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateLong } from "@/lib/dates";
import { PAYMENT_ACCOUNTS } from "@/lib/config";
import {
  ARAB_COUNTRIES,
  OTHER_COUNTRIES,
  normalizeNationalNumber,
  type PhoneCountry,
} from "@/lib/phone";
import { eventHeroUrl } from "@/lib/eventHero";
import type {
  EventGuestStatus,
  EventTicket,
  EventTicketStatus,
  TicketedEvent,
  TicketSummary,
} from "@/lib/events";

interface EventBundle {
  event: TicketedEvent;
  tickets: EventTicket[];
  summary: TicketSummary;
}

const GUEST_LABELS: Record<EventGuestStatus, string> = {
  open: "Open",
  contacted: "Contacted",
  follow_up: "Follow up",
  confirmed: "Confirmed",
  checked_in: "Checked in",
  wrong_number: "Wrong number",
  cancelled: "Cancelled",
};

// Staff pick these from the dropdown; "checked_in" is set by the arrivals
// stepper / "All in" button, never chosen by hand.
const SELECTABLE_EVENT_STATUSES: EventGuestStatus[] = [
  "open",
  "contacted",
  "follow_up",
  "confirmed",
  "wrong_number",
  "cancelled",
];

/** Dropdown options for a ticket, keeping a locked "checked in" visible. */
function eventStatusOptions(
  t: EventTicket
): { value: EventGuestStatus; disabled?: boolean }[] {
  const base = SELECTABLE_EVENT_STATUSES.map((v) => ({ value: v }));
  if (!SELECTABLE_EVENT_STATUSES.includes(t.guest_status)) {
    return [{ value: t.guest_status, disabled: true }, ...base];
  }
  return base;
}

const STATUS_BADGE: Record<EventTicketStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-oasis-100 text-oasis-700",
  rejected: "bg-blush-100 text-blush-700",
};

const inputClass =
  "w-full rounded-xl border border-oasis-950/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-oasis-950/25";


// ---------- create / edit form ----------

function EventForm({
  event,
  onClose,
  onSaved,
  onError,
}: {
  event: TicketedEvent | null;
  onClose: () => void;
  onSaved: () => void;
  onError: (m: string) => void;
}) {
  const isEdit = !!event;
  const [title, setTitle] = useState(event?.title ?? "");
  const [tagline, setTagline] = useState(event?.tagline ?? "");
  const [eventDate, setEventDate] = useState(event?.event_date ?? "");
  const [startTime, setStartTime] = useState(event?.start_time ?? "");
  const [price, setPrice] = useState(event ? String(event.price) : "");
  const [priceNote, setPriceNote] = useState(event?.price_note ?? "");
  const [capacity, setCapacity] = useState(
    event?.capacity != null ? String(event.capacity) : ""
  );
  const [location, setLocation] = useState(event?.location ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [highlights, setHighlights] = useState((event?.highlights ?? []).join("\n"));
  const [active, setActive] = useState(event ? event.active === 1 : true);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    onError("");
    const payload = {
      title,
      tagline: tagline || null,
      eventDate: eventDate || null,
      startTime: startTime || null,
      price: price === "" ? 0 : Number(price),
      priceNote: priceNote || null,
      capacity: capacity === "" ? null : Number(capacity),
      location: location || null,
      description: description || null,
      highlights: highlights.split("\n").map((h) => h.trim()).filter(Boolean),
      active,
    };
    try {
      const res = await fetch(
        isEdit ? `/api/admin/events/${event!.id}` : "/api/admin/events",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        onError(data?.error || "Could not save the event.");
        return;
      }
      onSaved();
    } catch {
      onError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold tracking-tight">
            {isEdit ? "Edit event" : "New event"}
          </h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="ev-title" className="mb-1 block text-xs font-medium text-zinc-500">Title</label>
            <input id="ev-title" required minLength={2} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="e.g. غنّو معنا" />
          </div>
          <div>
            <label htmlFor="ev-tagline" className="mb-1 block text-xs font-medium text-zinc-500">Tagline <span className="font-normal text-zinc-400">(optional)</span></label>
            <input id="ev-tagline" maxLength={160} value={tagline} onChange={(e) => setTagline(e.target.value)} className={inputClass} placeholder="An evening exclusively for the ladies ✨" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ev-date" className="mb-1 block text-xs font-medium text-zinc-500">Date</label>
              <input id="ev-date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="ev-time" className="mb-1 block text-xs font-medium text-zinc-500">Time</label>
              <input id="ev-time" maxLength={40} value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputClass} placeholder="8:00 PM" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="ev-price" className="mb-1 block text-xs font-medium text-zinc-500">Price (JOD)</label>
              <input id="ev-price" type="number" min={0} step="0.5" value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} placeholder="15" />
            </div>
            <div>
              <label htmlFor="ev-price-note" className="mb-1 block text-xs font-medium text-zinc-500">Price note</label>
              <input id="ev-price-note" maxLength={60} value={priceNote} onChange={(e) => setPriceNote(e.target.value)} className={inputClass} placeholder="includes shisha" />
            </div>
            <div>
              <label htmlFor="ev-capacity" className="mb-1 block text-xs font-medium text-zinc-500">Capacity</label>
              <input id="ev-capacity" type="number" min={0} value={capacity} onChange={(e) => setCapacity(e.target.value)} className={inputClass} placeholder="∞" />
            </div>
          </div>

          <div>
            <label htmlFor="ev-location" className="mb-1 block text-xs font-medium text-zinc-500">Location <span className="font-normal text-zinc-400">(optional)</span></label>
            <input id="ev-location" maxLength={120} value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} placeholder="Oasis by Azara · Amman" />
          </div>

          <div>
            <label htmlFor="ev-description" className="mb-1 block text-xs font-medium text-zinc-500">Description</label>
            <textarea id="ev-description" rows={5} maxLength={4000} value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} placeholder="Tell guests what the evening is about…" />
          </div>

          <div>
            <label htmlFor="ev-highlights" className="mb-1 block text-xs font-medium text-zinc-500">
              Highlights <span className="font-normal text-zinc-400">(one per line)</span>
            </label>
            <textarea id="ev-highlights" rows={4} value={highlights} onChange={(e) => setHighlights(e.target.value)} className={inputClass} placeholder={"Live music\nCards & games\nComplimentary shisha"} />
          </div>

          <label className="flex items-center gap-2.5 text-sm text-zinc-600">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-oasis-600" />
            Show on the website (uncheck to hide as a draft)
          </label>

          <div className="flex items-center justify-end gap-3 border-t border-zinc-100 pt-4">
            <button type="button" onClick={onClose} className="rounded-full border border-oasis-950/10 px-5 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="rounded-full bg-oasis-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-oasis-700 disabled:opacity-40">
              {busy ? "Saving…" : isEdit ? "Save changes" : "Create event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------- add walk-in reservation ----------

function AddTicketForm({
  event,
  onClose,
  onSaved,
  onError,
}: {
  event: TicketedEvent;
  onClose: () => void;
  onSaved: () => void;
  onError: (m: string) => void;
}) {
  const [name, setName] = useState("");
  const [country, setCountry] = useState<PhoneCountry>(ARAB_COUNTRIES[0]);
  const [phoneDigits, setPhoneDigits] = useState("");
  const [email, setEmail] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [sendConfirmation, setSendConfirmation] = useState(true);
  const [busy, setBusy] = useState(false);

  const qty = Number.parseInt(quantity, 10) || 0;
  const total = event.price * Math.max(qty, 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (phoneDigits.length < country.min) {
      onError(`Please enter a valid ${country.name} phone number.`);
      return;
    }
    setBusy(true);
    onError("");
    try {
      const res = await fetch("/api/admin/events/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          name,
          phone: `+${country.dial}${phoneDigits}`,
          email: email.trim() || undefined,
          quantity: qty,
          notes: notes.trim() || undefined,
          sendConfirmation,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        onError(data?.error || "Could not add the reservation.");
        return;
      }
      onSaved();
    } catch {
      onError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Add reservation</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Walk-in or phone booking for “{event.title}”, created as already approved.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="at-name" className="mb-1 block text-xs font-medium text-zinc-500">Guest name</label>
            <input id="at-name" required minLength={2} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rana Haddad" className={inputClass} />
          </div>

          <div>
            <label htmlFor="at-phone" className="mb-1 block text-xs font-medium text-zinc-500">Phone (WhatsApp)</label>
            <div className="flex gap-2">
              <select
                aria-label="Country code"
                value={country.code}
                onChange={(e) => {
                  const next = [...ARAB_COUNTRIES, ...OTHER_COUNTRIES].find((c) => c.code === e.target.value) ?? ARAB_COUNTRIES[0];
                  setCountry(next);
                  setPhoneDigits((d) => normalizeNationalNumber(d, next));
                }}
                className="w-32 shrink-0 rounded-xl border border-oasis-950/10 bg-white px-2 py-2.5 text-sm outline-none focus:border-oasis-950/25"
              >
                <optgroup label="Arab countries">
                  {ARAB_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.flag} {c.name} (+{c.dial})</option>
                  ))}
                </optgroup>
                <optgroup label="Other countries">
                  {OTHER_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.flag} {c.name} (+{c.dial})</option>
                  ))}
                </optgroup>
              </select>
              <input
                id="at-phone"
                required
                type="tel"
                inputMode="numeric"
                value={phoneDigits}
                onChange={(e) => setPhoneDigits(normalizeNationalNumber(e.target.value, country))}
                placeholder="79 000 0000"
                className="min-w-0 flex-1 rounded-xl border border-oasis-950/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-oasis-950/25"
              />
            </div>
          </div>

          <div>
            <label htmlFor="at-email" className="mb-1 block text-xs font-medium text-zinc-500">
              Email <span className="font-normal text-zinc-400">(optional)</span>
            </label>
            <input id="at-email" type="email" maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="guest@email.com" className={inputClass} />
          </div>

          <div>
            <label htmlFor="at-qty" className="mb-1 block text-xs font-medium text-zinc-500">Tickets</label>
            <input id="at-qty" type="number" required min={1} max={30} value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label htmlFor="at-notes" className="mb-1 block text-xs font-medium text-zinc-500">
              Notes <span className="font-normal text-zinc-400">(optional)</span>
            </label>
            <input id="at-notes" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. paid cash at the gate" className={inputClass} />
          </div>

          <label className="flex items-center gap-2.5 text-sm text-zinc-600">
            <input type="checkbox" checked={sendConfirmation} onChange={(e) => setSendConfirmation(e.target.checked)} className="h-4 w-4 accent-oasis-600" />
            Email the guest a confirmation (if an email is set)
          </label>

          <div className="flex items-center justify-between border-t border-zinc-100 pt-4">
            <p className="text-sm text-zinc-500">
              Total <span className="text-base font-semibold text-oasis-950">{total} JOD</span>{" "}
              <span className="text-xs text-zinc-400">payable at the gate</span>
            </p>
            <button type="submit" disabled={busy} className="rounded-full bg-oasis-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-oasis-700 disabled:opacity-40">
              {busy ? "Adding…" : "Add reservation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------- payment cell ----------

function PaymentCell({
  ticket,
  onPatch,
}: {
  ticket: EventTicket;
  onPatch: (id: number, body: Record<string, unknown>) => void;
}) {
  const [paid, setPaid] = useState(ticket.paid_amount == null ? "" : String(ticket.paid_amount));
  const [account, setAccount] = useState(ticket.paid_account ?? "Cash");
  const dirty =
    paid !== (ticket.paid_amount == null ? "" : String(ticket.paid_amount)) ||
    account !== (ticket.paid_account ?? "Cash");

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min={0}
        step="0.01"
        placeholder="—"
        value={paid}
        onChange={(e) => setPaid(e.target.value)}
        aria-label={`Paid for reservation ${ticket.id}`}
        className="w-16 rounded-lg border border-oasis-950/10 bg-white px-2 py-1.5 text-xs outline-none focus:border-oasis-500"
      />
      <select
        value={account}
        onChange={(e) => setAccount(e.target.value)}
        aria-label={`Account for reservation ${ticket.id}`}
        className="rounded-lg border border-oasis-950/10 bg-white px-1.5 py-1.5 text-xs outline-none focus:border-oasis-500"
      >
        {PAYMENT_ACCOUNTS.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>
      {dirty && (
        <button
          onClick={() => {
            const amt = paid.trim() === "" ? null : Number(paid);
            onPatch(ticket.id, { paidAmount: amt, paidAccount: amt === null ? null : account });
          }}
          className="rounded-full bg-oasis-600 px-3 py-1 text-xs font-medium text-white hover:bg-oasis-700"
        >
          Save
        </button>
      )}
    </div>
  );
}

// ---------- main ----------

export default function EventsAdmin({
  events,
  role,
}: {
  events: EventBundle[];
  role: "manager" | "staff";
}) {
  const router = useRouter();
  const isManager = role === "manager";
  const [message, setMessage] = useState("");
  const [formEvent, setFormEvent] = useState<TicketedEvent | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [ticketEvent, setTicketEvent] = useState<TicketedEvent | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const fileInputs = useRef<Record<number, HTMLInputElement | null>>({});

  async function patchTicket(id: number, body: Record<string, unknown>) {
    setBusyId(id);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/events/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setMessage(data?.error || "Could not update the reservation.");
        return;
      }
      router.refresh();
    } catch {
      setMessage("Could not reach the server.");
    } finally {
      setBusyId(null);
    }
  }

  async function patchEvent(id: number, body: Record<string, unknown>) {
    setMessage("");
    const res = await fetch(`/api/admin/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    if (!res || !res.ok) {
      setMessage("Could not update the event.");
      return;
    }
    router.refresh();
  }

  async function deleteEvent(id: number, title: string) {
    if (!confirm(`Delete "${title}" and all its reservations? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/events/${id}`, { method: "DELETE" }).catch(() => null);
    if (!res || !res.ok) {
      setMessage("Could not delete the event.");
      return;
    }
    router.refresh();
  }

  async function uploadHero(id: number, file: File) {
    setMessage("");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/admin/events/${id}/hero`, { method: "PUT", body: form }).catch(() => null);
    if (!res || !res.ok) {
      const data = res ? await res.json().catch(() => null) : null;
      setMessage(data?.error || "Could not upload the photo.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Events &amp; tickets</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {isManager
              ? "Create events, upload their hero photo, and manage reservations. Everything shows on the website instantly."
              : "Manage reservations for each event. Ask a manager to add or edit events."}
          </p>
        </div>
        {isManager && (
          <button
            onClick={() => {
              setFormEvent(null);
              setShowForm(true);
            }}
            className="rounded-full bg-oasis-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-oasis-700"
          >
            + New event
          </button>
        )}
      </div>

      {message && (
        <p className="mt-4 rounded-xl bg-blush-100 px-4 py-3 text-sm text-blush-700">{message}</p>
      )}

      {events.length === 0 && (
        <div className="mt-8 rounded-3xl border border-dashed border-oasis-950/15 bg-white p-12 text-center text-zinc-400">
          No events yet.{isManager ? " Create your first one above." : ""}
        </div>
      )}

      <div className="mt-6 space-y-8">
        {events.map(({ event, tickets, summary }) => {
          const hero = eventHeroUrl(event);
          return (
            <section key={event.id} className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
              {/* Event header */}
              <div className="flex flex-col gap-5 border-b border-zinc-100 p-6 sm:flex-row">
                <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-oasis-700 to-oasis-950">
                  {hero && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={hero} alt={event.title} className="h-full w-full object-cover" />
                  )}
                  {isManager && (
                    <>
                      <button
                        onClick={() => fileInputs.current[event.id]?.click()}
                        className="absolute inset-x-0 bottom-0 bg-black/55 py-1.5 text-center text-xs font-medium text-white backdrop-blur transition hover:bg-black/70"
                      >
                        {hero ? "Change photo" : "Upload photo"}
                      </button>
                      <input
                        ref={(el) => {
                          fileInputs.current[event.id] = el;
                        }}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadHero(event.id, f);
                          e.target.value = "";
                        }}
                      />
                    </>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-xl font-semibold">{event.title}</h2>
                    {event.active === 0 && (
                      <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-500">Hidden</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">
                    {event.event_date ? formatDateLong(event.event_date) : "No date"}
                    {event.start_time ? ` · ${event.start_time}` : ""} · {event.price} JOD
                    {event.capacity != null ? ` · cap ${event.capacity}` : " · unlimited"}
                  </p>
                  {isManager && (
                    <p className="mt-1 text-xs text-zinc-400">
                      Hero photo shows as a square — a 1:1 image looks best.
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                    <span className="text-zinc-500">Reservations <strong className="text-zinc-800">{summary.total}</strong></span>
                    <span className="text-zinc-500">Guests <strong className="text-zinc-800">{summary.guests}</strong></span>
                    <span className="text-zinc-500">Checked in <strong className="text-oasis-600">{summary.checkedIn}</strong></span>
                    <span className="text-zinc-500">Collected <strong className="text-oasis-600">{summary.collected} JOD</strong></span>
                    {summary.pending > 0 && (
                      <span className="text-amber-600">{summary.pending} awaiting approval</span>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => setTicketEvent(event)}
                      className="rounded-full bg-oasis-900 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-oasis-800"
                    >
                      + Add reservation
                    </button>
                    {isManager && (
                      <>
                        <a href={`/events/${event.slug}`} target="_blank" rel="noopener noreferrer" className="rounded-full border border-oasis-950/10 px-4 py-1.5 text-xs font-medium text-oasis-700 hover:bg-oasis-50">
                          View page ↗
                        </a>
                        <button onClick={() => { setFormEvent(event); setShowForm(true); }} className="rounded-full border border-oasis-950/10 px-4 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50">
                          Edit
                        </button>
                        <button onClick={() => patchEvent(event.id, { active: event.active === 0 })} className="rounded-full border border-oasis-950/10 px-4 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50">
                          {event.active === 1 ? "Hide" : "Show"}
                        </button>
                        <button onClick={() => deleteEvent(event.id, event.title)} className="rounded-full border border-blush-300 px-4 py-1.5 text-xs font-medium text-blush-700 hover:bg-blush-100">
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Reservations */}
              {tickets.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-zinc-400">No reservations yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200/70 text-[11px] uppercase tracking-wider text-zinc-400">
                        <th className="px-6 py-3">Guest</th>
                        <th className="px-4 py-3">Tickets</th>
                        <th className="px-4 py-3">Arrivals</th>
                        <th className="px-4 py-3">Payment</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="align-top">
                      {tickets.map((t) => {
                        const allIn = t.status === "approved" && t.checked_in_count >= t.quantity;
                        return (
                          <tr key={t.id} className={`border-b border-zinc-100 last:border-0 ${allIn ? "bg-zinc-50/70" : ""}`}>
                            <td className="px-6 py-3.5">
                              <p className="text-xs text-zinc-400">#{String(t.id).padStart(4, "0")}</p>
                              <p className="font-medium">{t.name}</p>
                              <p className="text-xs text-zinc-500">{t.phone}</p>
                              {t.email && <p className="text-xs text-zinc-500">{t.email}</p>}
                              {t.notes && <p className="mt-0.5 max-w-44 text-xs italic text-zinc-400">“{t.notes}”</p>}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              {t.quantity} × {event.price} JOD
                              <p className="text-xs text-zinc-400">{t.total_price} JOD total</p>
                            </td>
                            <td className="px-4 py-3.5">
                              {t.status === "approved" ? (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    aria-label="One fewer arrival"
                                    disabled={busyId === t.id || t.checked_in_count === 0}
                                    onClick={() => patchTicket(t.id, { checkedInCount: t.checked_in_count - 1 })}
                                    className="flex h-8 w-8 items-center justify-center rounded-full border border-oasis-950/10 text-base text-zinc-600 hover:bg-zinc-50 disabled:opacity-30"
                                  >−</button>
                                  <span className={`min-w-12 text-center text-sm font-semibold ${t.checked_in_count === t.quantity ? "text-oasis-600" : t.checked_in_count > 0 ? "text-amber-600" : "text-zinc-400"}`}>
                                    {t.checked_in_count} / {t.quantity}
                                  </span>
                                  <button
                                    aria-label="One more arrival"
                                    disabled={busyId === t.id || t.checked_in_count >= t.quantity}
                                    onClick={() => patchTicket(t.id, { checkedInCount: t.checked_in_count + 1 })}
                                    className="flex h-8 w-8 items-center justify-center rounded-full border border-oasis-950/10 text-base text-zinc-600 hover:bg-zinc-50 disabled:opacity-30"
                                  >+</button>
                                </div>
                              ) : (
                                <span className="text-sm text-zinc-400">{t.quantity} tickets</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5">
                              <PaymentCell ticket={t} onPatch={patchTicket} />
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex flex-col items-start gap-1.5">
                                <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_BADGE[t.status]}`}>
                                  {t.status === "approved" ? "Approved" : t.status === "pending" ? "Pending" : "Rejected"}
                                </span>
                                <select
                                  aria-label={`Guest status for reservation ${t.id}`}
                                  value={t.guest_status}
                                  disabled={busyId === t.id}
                                  onChange={(e) => patchTicket(t.id, { guestStatus: e.target.value })}
                                  className="rounded-lg border border-oasis-950/10 bg-white px-2 py-1 text-xs outline-none focus:border-oasis-950/25"
                                >
                                  {eventStatusOptions(t).map((o) => (
                                    <option key={o.value} value={o.value} disabled={o.disabled}>
                                      {GUEST_LABELS[o.value]}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex max-w-32 flex-wrap gap-1.5">
                                {t.status === "approved" && t.checked_in_count < t.quantity && (
                                  <button onClick={() => patchTicket(t.id, { checkedInCount: t.quantity })} disabled={busyId === t.id} className="rounded-full bg-oasis-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-oasis-800 disabled:opacity-40">All in</button>
                                )}
                                {t.status !== "approved" && (
                                  <button onClick={() => patchTicket(t.id, { status: "approved" })} disabled={busyId === t.id} className="rounded-full bg-oasis-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-oasis-700 disabled:opacity-40">Approve</button>
                                )}
                                {t.status !== "rejected" && (
                                  <button onClick={() => patchTicket(t.id, { status: "rejected" })} disabled={busyId === t.id} className="rounded-full border border-blush-300 px-3.5 py-1.5 text-xs font-medium text-blush-700 hover:bg-blush-100 disabled:opacity-40">Reject</button>
                                )}
                                {t.status !== "pending" && (
                                  <button onClick={() => patchTicket(t.id, { status: "pending" })} disabled={busyId === t.id} className="rounded-full border border-oasis-200 px-3.5 py-1.5 text-xs font-medium text-oasis-700 hover:bg-oasis-50 disabled:opacity-40">Reset</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {showForm && (
        <EventForm
          event={formEvent}
          onClose={() => setShowForm(false)}
          onError={setMessage}
          onSaved={() => {
            setShowForm(false);
            setMessage("");
            router.refresh();
          }}
        />
      )}

      {ticketEvent && (
        <AddTicketForm
          event={ticketEvent}
          onClose={() => setTicketEvent(null)}
          onError={setMessage}
          onSaved={() => {
            setTicketEvent(null);
            setMessage("");
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
