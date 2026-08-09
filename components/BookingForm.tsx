"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDateLong } from "@/lib/dates";
import {
  AGE_GUARDIAN,
  AGE_MONDAY,
  AGE_OTHER_DAYS,
  BOOKING_TERMS,
  HEARD_ABOUT_OPTIONS,
} from "@/lib/config";
import {
  ARAB_COUNTRIES,
  DEFAULT_PHONE_COUNTRY,
  OTHER_COUNTRIES,
  PHONE_COUNTRIES,
  normalizeNationalNumber,
} from "@/lib/phone";

interface Availability {
  date: string;
  bookable: boolean;
  available: boolean;
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

const inputClass =
  "w-full rounded-xl border border-oasis-950/10 bg-white px-4 py-3 outline-none transition focus:border-oasis-950/25 focus:ring-4 focus:ring-oasis-500/10";

export default function BookingForm({
  minDate,
  maxDate,
}: {
  minDate: string;
  maxDate: string;
}) {
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState("2");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneCountry, setPhoneCountry] = useState(DEFAULT_PHONE_COUNTRY);
  const [phoneDigits, setPhoneDigits] = useState("");
  const [email, setEmail] = useState("");
  const [heardAbout, setHeardAbout] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [termsChecked, setTermsChecked] = useState<boolean[]>(
    BOOKING_TERMS.map(() => false)
  );

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
  const country =
    PHONE_COUNTRIES.find((c) => c.code === phoneCountry) ?? PHONE_COUNTRIES[0];
  const soldOut = availability !== null && !availability.available;
  const total =
    availability && validGuests ? guestCount * availability.pricePerGuest : null;

  function toggleHeardAbout(option: string) {
    setHeardAbout((prev) =>
      prev.includes(option)
        ? prev.filter((o) => o !== option)
        : [...prev, option]
    );
  }

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
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          phone: `+${country.dial}${phoneDigits}`,
          email,
          date,
          guests: guestCount,
          heardAbout: heardAbout.length ? heardAbout : undefined,
          notes: notes || undefined,
          termsAccepted: termsChecked.every(Boolean),
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
      <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-oasis-950/5 sm:p-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-oasis-100 text-3xl">
          ✓
        </div>
        <h2 className="mt-5 font-display text-3xl font-semibold">
          You're confirmed, {confirmed.name.split(" ")[0]}!
        </h2>
        <p className="mt-3 text-oasis-900/70">
          Your booking is <strong>confirmed</strong>. A confirmation is on its
          way to your email and WhatsApp, and we'll send a reminder the day
          before your visit.
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
      className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-oasis-950/5 sm:p-10"
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
            className={inputClass}
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
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-oasis-900/50">
        * Mondays welcome ages {AGE_MONDAY}+; all other days are {AGE_OTHER_DAYS}+.
        Guests under {AGE_GUARDIAN} must be accompanied by a guardian aged{" "}
        {AGE_GUARDIAN}+.
      </p>

      {/* Availability + price strip */}
      {date && (
        <div
          className={`mt-5 rounded-2xl px-5 py-4 text-sm ${
            soldOut ? "bg-blush-100 text-blush-500" : "bg-oasis-50 text-oasis-800"
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
            <span>This date can’t be booked online. Please pick another day.</span>
          ) : soldOut ? (
            <span>
              <strong>{formatDateLong(date)}</strong> is fully booked. Please
              choose another day.
            </span>
          ) : (
            <span>
              <strong>{formatDateLong(date)}</strong>
              {" · "}
              {availability.isWeekend ? "Weekend" : "Weekday"} rate:{" "}
              <strong>
                {availability.pricePerGuest} {availability.currency}
              </strong>{" "}
              per guest · Available ✓
            </span>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="mb-1.5 block text-sm font-medium">
            First name
          </label>
          <input
            id="firstName"
            type="text"
            required
            minLength={2}
            maxLength={50}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Your first name"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="lastName" className="mb-1.5 block text-sm font-medium">
            Last name
          </label>
          <input
            id="lastName"
            type="text"
            required
            minLength={2}
            maxLength={50}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Your last name"
            className={inputClass}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="phone" className="mb-1.5 block text-sm font-medium">
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
              className="w-36 shrink-0 rounded-xl border border-oasis-950/10 bg-white px-2 py-3 outline-none transition focus:border-oasis-950/25 focus:ring-4 focus:ring-oasis-500/10"
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
              id="phone"
              type="tel"
              inputMode="numeric"
              required
              value={phoneDigits}
              onChange={(e) =>
                setPhoneDigits(normalizeNationalNumber(e.target.value, country))
              }
              placeholder={country.code === "JO" ? "79 123 4567" : "Phone number"}
              className={inputClass}
            />
          </div>
          <p className="mt-1 text-xs text-oasis-900/50">
            We send your confirmation and a reminder here on WhatsApp.
          </p>
        </div>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
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

      <fieldset className="mt-6">
        <legend className="mb-2 block text-sm font-medium">
          Where did you hear about us?{" "}
          <span className="font-normal text-oasis-900/40">(optional)</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {HEARD_ABOUT_OPTIONS.map((option) => {
            const active = heardAbout.includes(option);
            return (
              <label
                key={option}
                className={`cursor-pointer select-none rounded-full border px-4 py-2 text-sm transition ${
                  active
                    ? "border-oasis-600 bg-oasis-600 text-white"
                    : "border-oasis-950/10 bg-white text-oasis-800 hover:border-oasis-400"
                }`}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggleHeardAbout(option)}
                  className="sr-only"
                />
                {option}
              </label>
            );
          })}
        </div>
      </fieldset>

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
          className={inputClass}
        />
      </div>

      {/* Booking terms */}
      <fieldset className="mt-8 rounded-2xl bg-sand-100 p-6">
        <legend className="mb-1 px-1 text-sm font-semibold">
          Before you book <span className="text-blush-500">*</span>
        </legend>
        <div className="space-y-3">
          {BOOKING_TERMS.map((term, i) => (
            <label key={i} className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-oasis-900/75">
              <input
                type="checkbox"
                required
                checked={termsChecked[i]}
                onChange={(e) =>
                  setTermsChecked((prev) =>
                    prev.map((v, j) => (j === i ? e.target.checked : v))
                  )
                }
                className="mt-1 h-4 w-4 shrink-0 accent-oasis-600"
              />
              <span>
                {term} <span className="text-blush-500">*</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

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
          {submitting ? "Confirming…" : "Confirm booking"}
        </button>
      </div>
    </form>
  );
}
