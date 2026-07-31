import Link from "next/link";
import {
  CLUB_NAME,
  CURRENCY,
  WEEKDAY_PRICE,
  WEEKEND_PRICE,
} from "@/lib/config";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/" className="font-display text-2xl font-semibold tracking-wide">
          Oasis <span className="text-oasis-500">·</span>{" "}
          <span className="text-oasis-600">واحة السيدات</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium">
          <a href="#prices" className="hidden text-oasis-800 hover:text-oasis-600 sm:block">
            Prices
          </a>
          <a href="#how" className="hidden text-oasis-800 hover:text-oasis-600 sm:block">
            How it works
          </a>
          <Link
            href="/book"
            className="rounded-full bg-oasis-600 px-5 py-2.5 text-white shadow-sm transition hover:bg-oasis-700"
          >
            Book your day
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pb-20 pt-14 text-center sm:pt-24">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-sand-600">
          Ladies only · Private day resort
        </p>
        <h1 className="font-display text-5xl font-semibold leading-tight sm:text-7xl">
          Your day of calm,
          <br />
          <span className="text-oasis-600">sun and water.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-oasis-900/70">
          {CLUB_NAME} is a private swimming retreat reserved exclusively for
          ladies. Book your day, bring your friends, and leave the world at the
          gate.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/book"
            className="rounded-full bg-oasis-600 px-8 py-3.5 text-base font-medium text-white shadow-md transition hover:bg-oasis-700"
          >
            Reserve your spot
          </Link>
          <a
            href="#prices"
            className="rounded-full border border-oasis-300 bg-white/60 px-8 py-3.5 text-base font-medium text-oasis-800 transition hover:border-oasis-500"
          >
            See prices
          </a>
        </div>
      </section>

      {/* Wave divider */}
      <div aria-hidden className="text-oasis-100">
        <svg viewBox="0 0 1440 90" fill="currentColor" preserveAspectRatio="none" className="h-16 w-full">
          <path d="M0,40 C240,90 480,0 720,30 C960,60 1200,10 1440,50 L1440,90 L0,90 Z" />
        </svg>
      </div>

      {/* Prices */}
      <section id="prices" className="bg-oasis-100 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-display text-4xl font-semibold">
            Simple prices, full days
          </h2>
          <p className="mt-3 text-center text-oasis-900/60">
            One entry price per guest — swim, lounge and relax from open to close.
          </p>
          <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
            <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-oasis-200">
              <p className="text-sm font-semibold uppercase tracking-widest text-oasis-500">
                Weekdays
              </p>
              <p className="mt-1 text-sm text-oasis-900/50">Sunday – Thursday</p>
              <p className="mt-6 font-display text-6xl font-semibold">
                {WEEKDAY_PRICE}
                <span className="ml-2 text-2xl text-oasis-500">{CURRENCY}</span>
              </p>
              <p className="mt-2 text-sm text-oasis-900/60">per guest, all day</p>
            </div>
            <div className="rounded-3xl bg-oasis-900 p-8 text-white shadow-md">
              <p className="text-sm font-semibold uppercase tracking-widest text-oasis-300">
                Weekend
              </p>
              <p className="mt-1 text-sm text-white/50">Friday & Saturday</p>
              <p className="mt-6 font-display text-6xl font-semibold">
                {WEEKEND_PRICE}
                <span className="ml-2 text-2xl text-oasis-300">{CURRENCY}</span>
              </p>
              <p className="mt-2 text-sm text-white/60">per guest, all day</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-display text-4xl font-semibold">
            Booking is easy
          </h2>
          <div className="mx-auto mt-12 grid max-w-4xl gap-8 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "Request your day",
                text: "Choose a date, tell us how many guests are coming, and send your request in under a minute.",
              },
              {
                step: "2",
                title: "We confirm with you",
                text: "Our team reviews every request and calls you to confirm your reservation personally.",
              },
              {
                step: "3",
                title: "Enjoy the oasis",
                text: "Arrive, check in with your name, and the day is yours. Guest numbers are limited daily for your comfort.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blush-200 font-display text-xl font-semibold text-oasis-900">
                  {item.step}
                </div>
                <h3 className="mt-4 font-display text-2xl font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-oasis-900/60">{item.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-14 text-center">
            <Link
              href="/book"
              className="rounded-full bg-oasis-600 px-8 py-3.5 text-base font-medium text-white shadow-md transition hover:bg-oasis-700"
            >
              Book your day now
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-sand-200 px-6 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-sm text-oasis-900/50 sm:flex-row">
          <p>
            {CLUB_NAME} · Ladies only · Amman, Jordan
          </p>
          <div className="flex items-center gap-6">
            <Link href="/book" className="hover:text-oasis-600">
              Book a visit
            </Link>
            <Link href="/admin" className="hover:text-oasis-600">
              Staff login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
