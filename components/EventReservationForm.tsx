"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ARAB_COUNTRIES,
  DEFAULT_PHONE_COUNTRY,
  OTHER_COUNTRIES,
  PHONE_COUNTRIES,
  normalizeNationalNumber,
} from "@/lib/phone";

interface Confirmed {
  id: number;
  name: string;
  quantity: number;
  totalPrice: number;
  eventTitle: string;
}

const inputClass =
  "w-full rounded-xl border border-oasis-950/10 bg-white px-4 py-3 outline-none transition focus:border-oasis-950/25 focus:ring-4 focus:ring-oasis-500/10";

export default function EventReservationForm({
  eventId,
  price,
  soldOut,
}: {
  eventId: number;
  price: number;
  soldOut: boolean;
}) {
  const [name, setName] = useState("");
  const [phoneCountry, setPhoneCountry] = useState(DEFAULT_PHONE_COUNTRY);
  const [phoneDigits, setPhoneDigits] = useState("");
  const [email, setEmail] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState<Confirmed | null>(null);

  const country =
    PHONE_COUNTRIES.find((c) => c.code === phoneCountry) ?? PHONE_COUNTRIES[0];
  const qty = Number.parseInt(quantity, 10);
  const total = Number.isInteger(qty) && qty > 0 ? qty * price : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (phoneDigits.length < country.min) {
      setError(
        `Please enter a valid ${country.name} phone number (${country.min} to ${country.max} digits after +${country.dial}).`
      );
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/events/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          name: name.trim(),
          phone: `+${country.dial}${phoneDigits}`,
          email,
          quantity: qty,
          notes: notes || undefined,
          termsAccepted: terms,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setConfirmed(data.ticket);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmed) {
    return (
      <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-oasis-950/5 sm:p-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-oasis-100 text-3xl">
          ✓
        </div>
        <h2 className="mt-5 font-display text-3xl font-semibold">
          You&apos;re on the list, {confirmed.name.split(" ")[0]}!
        </h2>
        <p className="mt-3 text-oasis-900/70">
          Your reservation for <strong>{confirmed.eventTitle}</strong> is{" "}
          <strong>pending confirmation</strong>. Our team will reach out to
          confirm your spot.
        </p>
        <dl className="mt-6 space-y-2 rounded-2xl bg-sand-100 p-6 text-sm">
          <div className="flex justify-between">
            <dt className="text-oasis-900/60">Reference</dt>
            <dd className="font-semibold">#{String(confirmed.id).padStart(4, "0")}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-oasis-900/60">Tickets</dt>
            <dd className="font-semibold">{confirmed.quantity}</dd>
          </div>
          <div className="flex justify-between border-t border-sand-200 pt-2">
            <dt className="text-oasis-900/60">Total at the gate</dt>
            <dd className="font-semibold">{confirmed.totalPrice} JOD</dd>
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

  if (soldOut) {
    return (
      <div className="rounded-3xl bg-blush-100/60 p-8 text-center shadow-sm ring-1 ring-blush-200">
        <p className="font-display text-2xl font-semibold text-oasis-900">
          This event is fully booked
        </p>
        <p className="mt-2 text-sm text-oasis-900/70">
          Keep an eye out, more evenings are on the way.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-oasis-950/5 sm:p-10"
    >
      <h2 className="font-display text-2xl font-semibold">Reserve your spot</h2>
      <p className="mt-1 text-sm text-oasis-900/60">
        Send your request and we confirm every reservation. Nothing is charged
        online, and you pay at the entrance.
      </p>

      <div className="mt-6">
        <label htmlFor="ev-name" className="mb-1.5 block text-sm font-medium">
          Full name
        </label>
        <input
          id="ev-name"
          required
          minLength={2}
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className={inputClass}
        />
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="ev-phone" className="mb-1.5 block text-sm font-medium">
            Phone number
          </label>
          <div className="flex gap-2">
            <select
              aria-label="Country code"
              value={phoneCountry}
              onChange={(e) => {
                setPhoneCountry(e.target.value);
                const next =
                  PHONE_COUNTRIES.find((c) => c.code === e.target.value) ??
                  PHONE_COUNTRIES[0];
                setPhoneDigits((d) => d.slice(0, next.max));
              }}
              className="w-32 shrink-0 rounded-xl border border-oasis-950/10 bg-white px-2 py-3 outline-none transition focus:border-oasis-950/25 focus:ring-4 focus:ring-oasis-500/10"
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
              id="ev-phone"
              type="tel"
              inputMode="numeric"
              required
              value={phoneDigits}
              onChange={(e) => setPhoneDigits(normalizeNationalNumber(e.target.value, country))}
              placeholder={country.code === "JO" ? "79 123 4567" : "Phone number"}
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label htmlFor="ev-email" className="mb-1.5 block text-sm font-medium">
            Email
          </label>
          <input
            id="ev-email"
            type="email"
            required
            maxLength={200}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="ev-qty" className="mb-1.5 block text-sm font-medium">
            How many tickets?
          </label>
          <input
            id="ev-qty"
            type="number"
            required
            min={1}
            max={30}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="ev-notes" className="mb-1.5 block text-sm font-medium">
            Anything we should know?{" "}
            <span className="font-normal text-oasis-900/40">(optional)</span>
          </label>
          <input
            id="ev-notes"
            maxLength={500}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Celebrating something?"
            className={inputClass}
          />
        </div>
      </div>

      <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl bg-sand-100 p-5 text-sm leading-relaxed text-oasis-900/75">
        <input
          type="checkbox"
          required
          checked={terms}
          onChange={(e) => setTerms(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-oasis-600"
        />
        <span>
          I understand this is a reservation request. Our team will confirm my
          spot, and the {price} JOD per ticket is paid at the entrance.{" "}
          <span className="text-blush-500">*</span>
        </span>
      </label>

      {error && (
        <p className="mt-5 rounded-xl bg-blush-100 px-4 py-3 text-sm text-blush-500">
          {error}
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm text-oasis-900/60">
          {total !== null ? (
            <>
              Total at the gate:{" "}
              <span className="font-display text-2xl font-semibold text-oasis-950">
                {total} JOD
              </span>
            </>
          ) : (
            <span>Choose how many tickets.</span>
          )}
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-oasis-600 px-8 py-3.5 font-medium text-white shadow-md transition hover:bg-oasis-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Reserve my spot"}
        </button>
      </div>
    </form>
  );
}
