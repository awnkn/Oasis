"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDateLong } from "@/lib/dates";

interface Availability {
  date: string;
  bookable: boolean;
  remaining: number;
  capacity: number;
  pricePerGuest: number;
  isWeekend: boolean;
  currency: string;
}

interface ConfirmedBooking {
  id: number;
  name: string;
  date: string;
  guests: number;
  pricePerGuest: number;
  totalPrice: number;
  status: string;
}

export default function BookingForm({
  minDate,
  maxDate,
}: {
  minDate: string;
  maxDate: string;
}) {
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState("2");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  const [availability, setAvailability] = useState<Availability | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkFailed, setCheckFailed] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState<ConfirmedBooking | null>(null);

  useEffect(() => {
    setAvailability(null);
    setCheckFailed(false);
    if (!date) return;
    let cancelled = false;
    setChecking(true);
    fetch(`/api/availability?date=${encodeURIComponent(date)}`)
      .then((res) => {
        if (!res.ok) throw new Error("availability request failed");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setAvailability(data);
      })
      .catch(() => {
        if (!cancelled) setCheckFailed(true);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date, retryToken]);

  const guestCount = Number.parseInt(guests, 10);
  const validGuests = Number.isInteger(guestCount) && guestCount >= 1;
  const soldOut = availability !== null && availability.remaining <= 0;
  const total =
    availability && validGuests ? guestCount * availability.pricePerGuest : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email: email || undefined,
          date,
          guests: guestCount,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setConfirmed(data.booking);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmed) {
    return (
      <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-oasis-200 sm:p-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-oasis-100 text-3xl">
          ✓
        </div>
        <h2 className="mt-5 font-display text-3xl font-semibold">
          Request received, {confirmed.name.split(" ")[0]}!
        </h2>
        <p className="mt-3 text-oasis-900/70">
          Your booking is <strong>pending approval</strong>. Our team will call
          you shortly to confirm your day.
        </p>
        <dl className="mt-6 space-y-2 rounded-2xl bg-sand-100 p-6 text-sm">
          <div className="flex justify-between">
            <dt className="text-oasis-900/60">Reference</dt>
            <dd className="font-semibold">#{String(confirmed.id).padStart(4, "0")}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-oasis-900/60">Day</dt>
            <dd className="font-semibold">{formatDateLong(confirmed.date)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-oasis-900/60">Guests</dt>
            <dd className="font-semibold">{confirmed.guests}</dd>
          </div>
          <div className="flex justify-between border-t border-sand-200 pt-2">
            <dt className="text-oasis-900/60">Total at the gate</dt>
            <dd className="font-semibold">
              {confirmed.totalPrice} JOD
              <span className="ml-1 font-normal text-oasis-900/50">
                ({confirmed.pricePerGuest} JOD × {confirmed.guests})
              </span>
            </dd>
          </div>
        </dl>
        <Link
          href="/"
          className="mt-8 inline-block rounded-full bg-oasis-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-oasis-700"
        >
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-oasis-200 sm:p-10"
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="date" className="mb-1.5 block text-sm font-medium">
            Which day?
          </label>
          <input
            id="date"
            type="date"
            required
            min={minDate}
            max={maxDate}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-oasis-200 bg-sand-50 px-4 py-3 outline-none transition focus:border-oasis-500 focus:ring-2 focus:ring-oasis-200"
          />
        </div>
        <div>
          <label htmlFor="guests" className="mb-1.5 block text-sm font-medium">
            Number of guests
          </label>
          <input
            id="guests"
            type="number"
            required
            min={1}
            max={availability?.remaining || undefined}
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
            className="w-full rounded-xl border border-oasis-200 bg-sand-50 px-4 py-3 outline-none transition focus:border-oasis-500 focus:ring-2 focus:ring-oasis-200"
          />
        </div>
      </div>

      {/* Availability + price strip */}
      {date && (
        <div
          className={`mt-5 rounded-2xl px-5 py-4 text-sm ${
            soldOut
              ? "bg-blush-100 text-blush-500"
              : "bg-oasis-50 text-oasis-800"
          }`}
        >
          {checking ? (
            <span>Checking availability…</span>
          ) : checkFailed || !availability ? (
            <span className="flex flex-wrap items-center gap-3">
              Couldn’t check availability for this day.
              <button
                type="button"
                onClick={() => setRetryToken((t) => t + 1)}
                className="rounded-full border border-oasis-300 px-4 py-1 text-xs font-medium text-oasis-700 transition hover:border-oasis-500"
              >
                Try again
              </button>
            </span>
          ) : !availability.bookable ? (
            <span>This date can’t be booked online — please pick another day.</span>
          ) : soldOut ? (
            <span>
              <strong>{formatDateLong(date)}</strong> is fully booked. Please
              choose another day.
            </span>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                <strong>{formatDateLong(date)}</strong>
                {" · "}
                {availability.isWeekend ? "Weekend" : "Weekday"} rate:{" "}
                <strong>
                  {availability.pricePerGuest} {availability.currency}
                </strong>{" "}
                per guest
              </span>
              <span className="text-oasis-600">
                {availability.remaining} of {availability.capacity} spots left
              </span>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
            Full name
          </label>
          <input
            id="name"
            type="text"
            required
            minLength={2}
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-xl border border-oasis-200 bg-sand-50 px-4 py-3 outline-none transition focus:border-oasis-500 focus:ring-2 focus:ring-oasis-200"
          />
        </div>
        <div>
          <label htmlFor="phone" className="mb-1.5 block text-sm font-medium">
            Phone number
          </label>
          <input
            id="phone"
            type="tel"
            required
            minLength={6}
            maxLength={30}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="07X XXX XXXX"
            className="w-full rounded-xl border border-oasis-200 bg-sand-50 px-4 py-3 outline-none transition focus:border-oasis-500 focus:ring-2 focus:ring-oasis-200"
          />
          <p className="mt-1 text-xs text-oasis-900/50">
            We confirm every booking by phone.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
          Email <span className="font-normal text-oasis-900/40">(optional)</span>
        </label>
        <input
          id="email"
          type="email"
          maxLength={200}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-xl border border-oasis-200 bg-sand-50 px-4 py-3 outline-none transition focus:border-oasis-500 focus:ring-2 focus:ring-oasis-200"
        />
      </div>

      <div className="mt-6">
        <label htmlFor="notes" className="mb-1.5 block text-sm font-medium">
          Anything we should know?{" "}
          <span className="font-normal text-oasis-900/40">(optional)</span>
        </label>
        <textarea
          id="notes"
          rows={3}
          maxLength={500}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Birthday celebration, accessibility needs…"
          className="w-full rounded-xl border border-oasis-200 bg-sand-50 px-4 py-3 outline-none transition focus:border-oasis-500 focus:ring-2 focus:ring-oasis-200"
        />
      </div>

      {error && (
        <p className="mt-5 rounded-xl bg-blush-100 px-4 py-3 text-sm text-blush-500">
          {error}
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm text-oasis-900/60">
          {total !== null && !soldOut ? (
            <>
              Total at the gate:{" "}
              <span className="font-display text-2xl font-semibold text-oasis-950">
                {total} JOD
              </span>
            </>
          ) : (
            <span>Pick a day to see your total.</span>
          )}
        </div>
        <button
          type="submit"
          disabled={
            submitting ||
            !date ||
            checking ||
            !availability ||
            !availability.bookable ||
            soldOut
          }
          className="rounded-full bg-oasis-600 px-8 py-3.5 font-medium text-white shadow-md transition hover:bg-oasis-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Send booking request"}
        </button>
      </div>
    </form>
  );
}
