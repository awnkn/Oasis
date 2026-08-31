"use client";

import { useEffect, useState } from "react";
import type { Booking } from "@/lib/bookings";

/**
 * Edit every detail of an existing booking. The server re-checks
 * capacity when the day or group size changes, re-prices from the new
 * day, and writes each change to the history log.
 */
export default function EditBookingModal({
  booking,
  onClose,
  onSaved,
}: {
  booking: Booking | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState("1");
  const [notes, setNotes] = useState("");
  const [heardAbout, setHeardAbout] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Refill whenever a different booking is opened.
  useEffect(() => {
    if (!booking) return;
    setName(booking.name);
    setPhone(booking.phone);
    setEmail(booking.email ?? "");
    setDate(booking.date);
    setGuests(String(booking.guests));
    setNotes(booking.notes ?? "");
    setHeardAbout(booking.heard_about ?? "");
    setError("");
  }, [booking]);

  if (!booking) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!booking) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email: email.trim() || null,
          date,
          guests: Number.parseInt(guests, 10),
          notes: notes.trim() || null,
          heardAbout: heardAbout.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Could not save the changes.");
        return;
      }
      onSaved();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-oasis-950/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-oasis-950/25";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Edit booking #{String(booking.id).padStart(4, "0")}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Every change is recorded in the history log. Moving the day
              re-checks space and updates the price automatically.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="eb-name" className="mb-1 block text-xs font-medium text-zinc-500">
              Guest name
            </label>
            <input
              id="eb-name"
              required
              minLength={2}
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="eb-phone" className="mb-1 block text-xs font-medium text-zinc-500">
                Phone
              </label>
              <input
                id="eb-phone"
                required
                type="tel"
                minLength={6}
                maxLength={30}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="eb-email" className="mb-1 block text-xs font-medium text-zinc-500">
                Email <span className="font-normal text-zinc-400">(optional)</span>
              </label>
              <input
                id="eb-email"
                type="email"
                maxLength={200}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="eb-date" className="mb-1 block text-xs font-medium text-zinc-500">
                Day
              </label>
              <input
                id="eb-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="eb-guests" className="mb-1 block text-xs font-medium text-zinc-500">
                Guests
              </label>
              <input
                id="eb-guests"
                type="number"
                required
                min={1}
                max={300}
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="eb-heard" className="mb-1 block text-xs font-medium text-zinc-500">
              Where they heard about us{" "}
              <span className="font-normal text-zinc-400">(optional)</span>
            </label>
            <input
              id="eb-heard"
              maxLength={200}
              value={heardAbout}
              onChange={(e) => setHeardAbout(e.target.value)}
              placeholder="e.g. Instagram"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="eb-notes" className="mb-1 block text-xs font-medium text-zinc-500">
              Notes <span className="font-normal text-zinc-400">(optional)</span>
            </label>
            <textarea
              id="eb-notes"
              maxLength={500}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputClass}
            />
          </div>

          {error && (
            <p className="rounded-xl bg-blush-100 px-4 py-3 text-sm text-blush-700">{error}</p>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-oasis-950/10 px-5 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-oasis-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-oasis-700 disabled:opacity-40"
            >
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
