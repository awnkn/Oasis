"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateLong } from "@/lib/dates";
import { PAYMENT_ACCOUNTS } from "@/lib/config";
import type {
  EventGuestStatus,
  EventTicket,
  EventTicketStatus,
  TicketedEvent,
  TicketSummary,
} from "@/lib/events";
import { ArrowUpRight } from "@/components/icons";

interface EventBundle {
  event: TicketedEvent;
  tickets: EventTicket[];
  summary: TicketSummary;
}

const GUEST_LABELS: Record<EventGuestStatus, string> = {
  open: "Open",
  contacted: "Contacted",
  confirmed: "Confirmed",
  checked_in: "Checked in",
  cancelled: "Cancelled",
};

const STATUS_BADGE: Record<EventTicketStatus, string> = {
  pending: "bg-status-caution-tint text-status-caution",
  approved: "bg-oasis-100 text-oasis-700",
  rejected: "bg-status-critical-tint text-status-critical",
};

const inputClass =
  "w-full rounded-xl border border-oasis-950/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-oasis-950/25";

function heroUrl(e: TicketedEvent): string | null {
  return e.hero_updated_at
    ? `/api/events/${e.id}/hero?v=${encodeURIComponent(e.hero_updated_at)}`
    : null;
}

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
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-ink-subtle hover:bg-surface-muted hover:text-ink">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Title</label>
            <input required minLength={2} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="e.g. غنّو معنا" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Tagline <span className="font-normal text-ink-subtle">(optional)</span></label>
            <input maxLength={160} value={tagline} onChange={(e) => setTagline(e.target.value)} className={inputClass} placeholder="An evening exclusively for the ladies" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">Date</label>
              <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">Time</label>
              <input maxLength={40} value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputClass} placeholder="8:00 PM" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">Price (JOD)</label>
              <input type="number" min={0} step="0.5" value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} placeholder="15" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">Price note</label>
              <input maxLength={60} value={priceNote} onChange={(e) => setPriceNote(e.target.value)} className={inputClass} placeholder="includes shisha" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">Capacity</label>
              <input type="number" min={0} value={capacity} onChange={(e) => setCapacity(e.target.value)} className={inputClass} placeholder="∞" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Location <span className="font-normal text-ink-subtle">(optional)</span></label>
            <input maxLength={120} value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} placeholder="Oasis by Azara · Amman" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Description</label>
            <textarea rows={5} maxLength={4000} value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} placeholder="Tell guests what the evening is about…" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">
              Highlights <span className="font-normal text-ink-subtle">(one per line)</span>
            </label>
            <textarea rows={4} value={highlights} onChange={(e) => setHighlights(e.target.value)} className={inputClass} placeholder={"Live music\nCards & games\nComplimentary shisha"} />
          </div>

          <label className="flex items-center gap-2.5 text-sm text-ink-muted">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-oasis-600" />
            Show on the website (uncheck to hide as a draft)
          </label>

          <div className="flex items-center justify-end gap-3 border-t border-line-soft pt-4">
            <button type="button" onClick={onClose} className="rounded-full border border-oasis-950/10 px-5 py-2.5 text-sm font-medium text-ink-muted hover:bg-surface-sunken">
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
        className="w-16 rounded-lg border border-oasis-950/10 bg-white min-h-8 px-2 py-1.5 text-xs outline-none focus:border-oasis-500"
      />
      <select
        value={account}
        onChange={(e) => setAccount(e.target.value)}
        aria-label={`Account for reservation ${ticket.id}`}
        className="rounded-lg border border-oasis-950/10 bg-white min-h-8 px-1.5 py-1.5 text-xs outline-none focus:border-oasis-500"
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
          <p className="mt-1 text-sm text-ink-muted">
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
        <p role="status" aria-live="polite" className="mt-4 rounded-xl border border-status-caution/30 bg-status-caution-tint px-4 py-3 text-sm text-status-caution">{message}</p>
      )}

      {events.length === 0 && (
        <div className="mt-8 rounded-3xl border border-dashed border-oasis-950/15 bg-white p-12 text-center text-ink-subtle">
          No events yet.{isManager ? " Create your first one above." : ""}
        </div>
      )}

      <div className="mt-6 space-y-8">
        {events.map(({ event, tickets, summary }) => {
          const hero = heroUrl(event);
          return (
            <section key={event.id} className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
              {/* Event header */}
              <div className="flex flex-col gap-5 border-b border-line-soft p-6 sm:flex-row">
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
                      <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-semibold text-ink-muted">Hidden</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">
                    {event.event_date ? formatDateLong(event.event_date) : "No date"}
                    {event.start_time ? ` · ${event.start_time}` : ""} · {event.price} JOD
                    {event.capacity != null ? ` · cap ${event.capacity}` : " · unlimited"}
                  </p>
                  {isManager && (
                    <p className="mt-1 text-xs text-ink-subtle">
                      Hero photo shows as a square — a 1:1 image looks best.
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                    <span className="text-ink-muted">Reservations <strong className="text-ink">{summary.total}</strong></span>
                    <span className="text-ink-muted">Guests <strong className="text-ink">{summary.guests}</strong></span>
                    <span className="text-ink-muted">Checked in <strong className="text-oasis-600">{summary.checkedIn}</strong></span>
                    <span className="text-ink-muted">Collected <strong className="text-oasis-600">{summary.collected} JOD</strong></span>
                    {summary.pending > 0 && (
                      <span className="text-status-caution">{summary.pending} awaiting approval</span>
                    )}
                  </div>

                  {isManager && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <a href={`/events/${event.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-oasis-950/10 px-4 py-1.5 text-xs font-medium text-oasis-700 transition hover:bg-oasis-50">
                        View page
              <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                      <button onClick={() => { setFormEvent(event); setShowForm(true); }} className="rounded-full border border-oasis-950/10 min-h-8 px-4 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-sunken">
                        Edit
                      </button>
                      <button onClick={() => patchEvent(event.id, { active: event.active === 0 })} className="rounded-full border border-oasis-950/10 min-h-8 px-4 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-sunken">
                        {event.active === 1 ? "Hide" : "Show"}
                      </button>
                      <button onClick={() => deleteEvent(event.id, event.title)} className="inline-flex min-h-8 items-center rounded-full border border-status-critical/40 min-h-8 px-4 py-1.5 text-xs font-medium text-status-critical transition hover:bg-status-critical-tint">
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Reservations */}
              {tickets.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-ink-subtle">No reservations yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-line/70 text-[11px] uppercase tracking-wider text-ink-subtle">
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
                          <tr key={t.id} className={`border-b border-line-soft last:border-0 ${allIn ? "bg-surface-sunken/70" : ""}`}>
                            <td className="px-6 py-3.5">
                              <p className="text-xs text-ink-subtle">#{String(t.id).padStart(4, "0")}</p>
                              <p className="font-medium">{t.name}</p>
                              <p className="text-xs text-ink-muted">{t.phone}</p>
                              {t.email && <p className="text-xs text-ink-muted">{t.email}</p>}
                              {t.notes && <p className="mt-0.5 max-w-44 text-xs italic text-ink-subtle">“{t.notes}”</p>}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              {t.quantity} × {event.price} JOD
                              <p className="text-xs text-ink-subtle">{t.total_price} JOD total</p>
                            </td>
                            <td className="px-4 py-3.5">
                              {t.status === "approved" ? (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    aria-label="One fewer arrival"
                                    disabled={busyId === t.id || t.checked_in_count === 0}
                                    onClick={() => patchTicket(t.id, { checkedInCount: t.checked_in_count - 1 })}
                                    className="flex h-6 w-6 items-center justify-center rounded-full border border-oasis-950/10 text-sm text-ink-muted hover:bg-surface-sunken disabled:opacity-30"
                                  >−</button>
                                  <span className={`min-w-12 text-center text-sm font-semibold ${t.checked_in_count === t.quantity ? "text-oasis-600" : t.checked_in_count > 0 ? "text-status-caution" : "text-ink-subtle"}`}>
                                    {t.checked_in_count} / {t.quantity}
                                  </span>
                                  <button
                                    aria-label="One more arrival"
                                    disabled={busyId === t.id || t.checked_in_count >= t.quantity}
                                    onClick={() => patchTicket(t.id, { checkedInCount: t.checked_in_count + 1 })}
                                    className="flex h-6 w-6 items-center justify-center rounded-full border border-oasis-950/10 text-sm text-ink-muted hover:bg-surface-sunken disabled:opacity-30"
                                  >+</button>
                                </div>
                              ) : (
                                <span className="text-sm text-ink-subtle">{t.quantity} tickets</span>
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
                                  className="rounded-lg border border-oasis-950/10 bg-white min-h-8 px-2 py-1 text-xs outline-none focus:border-oasis-950/25"
                                >
                                  {(Object.keys(GUEST_LABELS) as EventGuestStatus[]).map((s) => (
                                    <option key={s} value={s}>{GUEST_LABELS[s]}</option>
                                  ))}
                                </select>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex max-w-32 flex-wrap gap-1.5">
                                {t.status === "approved" && t.checked_in_count < t.quantity && (
                                  <button onClick={() => patchTicket(t.id, { checkedInCount: t.quantity })} disabled={busyId === t.id} className="rounded-full bg-oasis-900 min-h-8 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-oasis-800 disabled:opacity-40">All in</button>
                                )}
                                {t.status !== "approved" && (
                                  <button onClick={() => patchTicket(t.id, { status: "approved" })} disabled={busyId === t.id} className="rounded-full bg-oasis-600 min-h-8 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-oasis-700 disabled:opacity-40">Approve</button>
                                )}
                                {t.status !== "rejected" && (
                                  <button onClick={() => patchTicket(t.id, { status: "rejected" })} disabled={busyId === t.id} className="inline-flex min-h-8 items-center rounded-full border border-status-critical/40 min-h-8 px-3.5 py-1.5 text-xs font-medium text-status-critical transition hover:bg-status-critical-tint disabled:opacity-40">Reject</button>
                                )}
                                {t.status !== "pending" && (
                                  <button onClick={() => patchTicket(t.id, { status: "pending" })} disabled={busyId === t.id} className="rounded-full border border-oasis-200 min-h-8 px-3.5 py-1.5 text-xs font-medium text-oasis-700 hover:bg-oasis-50 disabled:opacity-40">Reset</button>
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
    </div>
  );
}
