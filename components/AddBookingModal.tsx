"use client";

import { useState } from "react";
import {
  ARAB_COUNTRIES,
  OTHER_COUNTRIES,
  normalizeNationalNumber,
  type PhoneCountry,
} from "@/lib/phone";
import { WEEKEND_DAYS, WEEKDAY_PRICE, WEEKEND_PRICE } from "@/lib/config";

function priceFor(date: string): number {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return WEEKEND_DAYS.includes(day) ? WEEKEND_PRICE : WEEKDAY_PRICE;
}

/**
 * Manual booking entry for walk-ins and phone bookings. The booking is
 * created already approved with the guest marked "confirmed".
 */
export default function AddBookingModal({
  open,
  today,
  onClose,
  onSaved,
}: {
  open: boolean;
  today: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [country, setCountry] = useState<PhoneCountry>(ARAB_COUNTRIES[0]);
  const [phoneDigits, setPhoneDigits] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState(today);
  const [guests, setGuests] = useState("1");
  const [notes, setNotes] = useState("");
  const [sendConfirmation, setSendConfirmation] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const guestCount = Number.parseInt(guests, 10) || 0;
  const total = date ? priceFor(date) * Math.max(guestCount, 0) : 0;

  function reset() {
    setName("");
    setPhoneDigits("");
    setEmail("");
    setDate(today);
    setGuests("1");
    setNotes("");
    setSendConfirmation(true);
    setError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (phoneDigits.length < country.min) {
      setError(
        `Please enter a valid ${country.name} phone number (${country.min} to ${country.max} digits after +${country.dial}).`
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone: `+${country.dial}${phoneDigits}`,
          email: email.trim() || undefined,
          date,
          guests: guestCount,
          notes: notes.trim() || undefined,
          sendConfirmation,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Could not add the booking.");
        return;
      }
      reset();
      onSaved();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

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
            <h2 className="text-lg font-semibold tracking-tight">Add booking</h2>
            <p className="mt-1 text-sm text-zinc-500">
              For walk in and phone bookings, created as already approved.
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
            <label htmlFor="mb-name" className="mb-1 block text-xs font-medium text-zinc-500">
              Guest name
            </label>
            <input
              id="mb-name"
              required
              minLength={2}
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rana Haddad"
              className="w-full rounded-xl border border-oasis-950/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-oasis-950/25"
            />
          </div>

          <div>
            <label htmlFor="mb-phone" className="mb-1 block text-xs font-medium text-zinc-500">
              Phone (WhatsApp)
            </label>
            <div className="flex gap-2">
              <select
                aria-label="Country code"
                value={country.code}
                onChange={(e) => {
                  const next =
                    [...ARAB_COUNTRIES, ...OTHER_COUNTRIES].find(
                      (c) => c.code === e.target.value
                    ) ?? ARAB_COUNTRIES[0];
                  setCountry(next);
                  setPhoneDigits((d) => normalizeNationalNumber(d, next));
                }}
                className="w-32 shrink-0 rounded-xl border border-oasis-950/10 bg-white px-2 py-2.5 text-sm outline-none focus:border-oasis-950/25"
              >
                <optgroup label="Arab countries">
                  {ARAB_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name} (+{c.dial})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Other countries">
                  {OTHER_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name} (+{c.dial})
                    </option>
                  ))}
                </optgroup>
              </select>
              <input
                id="mb-phone"
                required
                type="tel"
                inputMode="numeric"
                value={phoneDigits}
                onChange={(e) =>
                  setPhoneDigits(normalizeNationalNumber(e.target.value, country))
                }
                placeholder="79 000 0000"
                className="min-w-0 flex-1 rounded-xl border border-oasis-950/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-oasis-950/25"
              />
            </div>
          </div>

          <div>
            <label htmlFor="mb-email" className="mb-1 block text-xs font-medium text-zinc-500">
              Email <span className="font-normal text-zinc-400">(optional)</span>
            </label>
            <input
              id="mb-email"
              type="email"
              maxLength={200}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="guest@email.com"
              className="w-full rounded-xl border border-oasis-950/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-oasis-950/25"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="mb-date" className="mb-1 block text-xs font-medium text-zinc-500">
                Day
              </label>
              <input
                id="mb-date"
                type="date"
                required
                min={today}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-oasis-950/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-oasis-950/25"
              />
            </div>
            <div>
              <label htmlFor="mb-guests" className="mb-1 block text-xs font-medium text-zinc-500">
                Guests
              </label>
              <input
                id="mb-guests"
                type="number"
                required
                min={1}
                max={300}
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
                className="w-full rounded-xl border border-oasis-950/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-oasis-950/25"
              />
            </div>
          </div>

          <div>
            <label htmlFor="mb-notes" className="mb-1 block text-xs font-medium text-zinc-500">
              Notes <span className="font-normal text-zinc-400">(optional)</span>
            </label>
            <input
              id="mb-notes"
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. paid cash at the gate"
              className="w-full rounded-xl border border-oasis-950/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-oasis-950/25"
            />
          </div>

          <label className="flex items-center gap-2.5 text-sm text-zinc-600">
            <input
              type="checkbox"
              checked={sendConfirmation}
              onChange={(e) => setSendConfirmation(e.target.checked)}
              className="h-4 w-4 accent-oasis-600"
            />
            Send the guest a confirmation (email / WhatsApp, if set up)
          </label>

          {error && (
            <p className="rounded-xl bg-blush-100 px-4 py-3 text-sm text-blush-500">{error}</p>
          )}

          <div className="flex items-center justify-between border-t border-zinc-100 pt-4">
            <p className="text-sm text-zinc-500">
              Total{" "}
              <span className="text-base font-semibold text-oasis-950">
                {total} JOD
              </span>{" "}
              <span className="text-xs text-zinc-400">payable at the gate</span>
            </p>
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-oasis-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-oasis-700 disabled:opacity-40"
            >
              {busy ? "Adding…" : "Add booking"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
