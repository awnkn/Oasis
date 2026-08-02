import Link from "next/link";
import {
  AGE_GUARDIAN,
  AGE_MONDAY,
  AGE_OTHER_DAYS,
  CLUB_NAME,
  CURRENCY,
  WEEKDAY_PRICE,
  WEEKEND_PRICE,
} from "@/lib/config";

function Wordmark({ light = false }: { light?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={light ? "/images/logo-white.png" : "/images/logo-black.png"}
      alt="Oasis by Azara"
      className={light ? "h-12 w-auto" : "h-10 w-auto"}
    />
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative flex min-h-[92svh] flex-col overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hero.jpg"
          alt="The pool at golden hour"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-oasis-950/60 via-oasis-950/20 to-oasis-950/70" />

        <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
          <Link href="/">
            <Wordmark light />
          </Link>
          <Link
            href="/book?src=header"
            className="rounded-full bg-white/95 px-5 py-2.5 text-sm font-medium text-oasis-900 shadow-md transition hover:bg-white"
          >
            Book your day
          </Link>
        </header>

        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 py-20 text-center text-white">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.35em] text-sand-200">
            A sanctuary for women · Ladies only
          </p>
          <h1 className="max-w-4xl font-display text-4xl font-semibold leading-[1.12] sm:text-6xl lg:text-7xl">
            A space where you are fully&nbsp;present.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-white/85">
            Sun-washed pools, complete privacy and slow days — designed
            exclusively for women, at every hour.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/book?src=hero"
              className="rounded-full bg-oasis-500 px-8 py-3.5 text-base font-medium text-white shadow-lg transition hover:bg-oasis-400"
            >
              Reserve your day
            </Link>
            <a
              href="#prices"
              className="rounded-full border border-white/50 bg-white/10 px-8 py-3.5 text-base font-medium text-white backdrop-blur transition hover:bg-white/20"
            >
              See prices
            </a>
          </div>
          <p className="mt-5 text-sm text-white/60">
            Takes under a minute · No online payment — pay at the gate
          </p>
        </div>

        <div className="relative z-10 border-t border-white/15 bg-oasis-950/40 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-2 px-6 py-4 text-sm text-white/85">
            <span>Sun – Thu · {WEEKDAY_PRICE} {CURRENCY} per guest</span>
            <span className="hidden text-white/30 sm:block">✦</span>
            <span>Fri & Sat · {WEEKEND_PRICE} {CURRENCY} per guest</span>
            <span className="hidden text-white/30 sm:block">✦</span>
            <span>Limited guests each day, for your calm</span>
          </div>
        </div>
      </section>

      {/* Brand moment */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sand-600">
            More than relaxation
          </p>
          <h2 className="mt-4 font-display text-4xl font-semibold leading-tight sm:text-5xl">
            A place you return to, slowly.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-oasis-900/70">
            Every element of {CLUB_NAME} is designed to let you be fully
            present without compromise. Carefully designed for complete
            privacy, so every moment feels lighter, freer and wholly your own.
          </p>
          <p className="mt-4 text-lg leading-relaxed text-oasis-900/70">
            Oasis exists to remind every woman that caring for herself is not
            a luxury reserved for special occasions — it is a rhythm worth
            returning to, again and again.
          </p>
          <Link
            href="/book?src=story"
            className="mt-8 inline-block rounded-full bg-oasis-600 px-7 py-3 font-medium text-white shadow-md transition hover:bg-oasis-700"
          >
            Book your visit
          </Link>
        </div>
        <div className="relative mx-auto w-full max-w-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/sand-logo.jpg"
            alt="The Oasis by Azara mark pressed into sand"
            className="w-full rounded-3xl object-cover shadow-xl ring-1 ring-sand-200"
          />
        </div>
      </section>

      {/* Why Oasis */}
      <section className="border-y border-oasis-950/5 bg-white px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center font-display text-4xl font-semibold sm:text-5xl">
            Why women choose Oasis
          </h2>
          <div className="mx-auto mt-14 grid max-w-5xl gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Ladies only. Always.",
                text: "Every hour of every day — no exceptions, no “family times”.",
              },
              {
                title: "No cameras inside",
                text: "Complete privacy in every interior space, so you can simply be.",
              },
              {
                title: "Never crowded",
                text: "Entry is capped every single day — your calm is protected.",
              },
              {
                title: "Pools for every mood",
                text: "Sun-soaked lagoons, still water, shaded corners — choose by feeling.",
              },
              {
                title: "Book in a minute",
                text: "No online payment, no cards — reserve now, pay at the gate.",
              },
              {
                title: "Personally confirmed",
                text: "A real person calls you to confirm every single booking.",
              },
            ].map((point) => (
              <div key={point.title} className="border-t border-oasis-950/10 pt-5">
                <h3 className="font-display text-xl font-semibold">{point.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-oasis-900/60">
                  {point.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section id="gallery" className="bg-oasis-950 px-6 py-24 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.3em] text-oasis-300">
            The space
          </p>
          <h2 className="mt-3 text-center font-display text-4xl font-semibold sm:text-5xl">
            Every space tells its own quiet story.
          </h2>
          <div className="mt-14 grid auto-rows-[190px] grid-cols-2 gap-4 md:grid-cols-4 md:auto-rows-[230px]">
            {[
              { src: "/images/lagoon.jpg", alt: "The sand lagoon pool beneath the stone arches", span: "col-span-2 row-span-1" },
              { src: "/images/lagoon-tall.jpg", alt: "The lagoon under a palm canopy", span: "col-span-1 row-span-2" },
              { src: "/images/mural.jpg", alt: "The Oasis mural at the entrance", span: "col-span-1 row-span-1" },
              { src: "/images/greens.jpg", alt: "Greenery between the pools", span: "col-span-1 row-span-1" },
              { src: "/images/pool.jpg", alt: "The main pool and jacuzzi", span: "col-span-2 row-span-1" },
              { src: "/images/entrance.jpg", alt: "The entrance at golden hour", span: "col-span-2 row-span-1" },
            ].map((img) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.src}
                src={img.src}
                alt={img.alt}
                className={`h-full w-full rounded-2xl object-cover transition duration-300 hover:scale-[1.015] ${img.span}`}
              />
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/book?src=gallery"
              className="inline-block rounded-full border border-white/40 bg-white/10 px-8 py-3.5 font-medium text-white backdrop-blur transition hover:bg-white/20"
            >
              Come see it for yourself →
            </Link>
          </div>
        </div>
      </section>

      {/* Prices */}
      <section id="prices" className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-display text-4xl font-semibold sm:text-5xl">
            Book Your Spot
          </h2>
          <p className="mt-3 text-center text-oasis-900/60">
            One entry price per guest — swim, lounge and relax from open to close.
          </p>
          <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
            <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-oasis-950/5">
              <p className="text-sm font-semibold uppercase tracking-widest text-oasis-500">
                Weekdays
              </p>
              <p className="mt-1 text-sm text-oasis-900/50">Sunday – Thursday</p>
              <p className="mt-6 font-display text-6xl font-semibold">
                {WEEKDAY_PRICE}
                <span className="ml-2 text-2xl text-oasis-500">{CURRENCY}</span>
              </p>
              <p className="mt-2 text-sm text-oasis-900/60">per guest, all day</p>
              <Link
                href="/book?src=pricing-weekday"
                className="mt-6 inline-block rounded-full border border-oasis-300 px-6 py-2.5 text-sm font-medium text-oasis-700 transition hover:border-oasis-500 hover:bg-oasis-50"
              >
                Book a weekday
              </Link>
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
              <Link
                href="/book?src=pricing-weekend"
                className="mt-6 inline-block rounded-full bg-white/95 px-6 py-2.5 text-sm font-medium text-oasis-900 transition hover:bg-white"
              >
                Book a weekend
              </Link>
            </div>
          </div>

          {/* Age note */}
          <div className="mx-auto mt-8 max-w-3xl rounded-3xl border border-blush-200 bg-blush-100/60 px-7 py-5 text-center">
            <p className="text-sm leading-relaxed text-oasis-900/80">
              <span className="mr-1.5">🌸</span>
              <strong className="font-semibold">A little note on ages</strong> —
              Mondays welcome ladies {AGE_MONDAY}+, and every other day is for
              ages {AGE_OTHER_DAYS}+. Guests under {AGE_GUARDIAN} join with a
              guardian aged {AGE_GUARDIAN}+.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-sand-100 px-6 py-24">
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
        </div>
      </section>

      {/* Closing CTA */}
      <section className="relative overflow-hidden px-6 py-28">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/lagoon.jpg"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-oasis-950/65" />
        <div className="relative mx-auto max-w-3xl text-center text-white">
          <h2 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">
            Your day of stillness is waiting.
          </h2>
          <p className="mt-4 text-lg text-white/80">
            Pick your day — we&apos;ll hold the calm for you.
          </p>
          <Link
            href="/book?src=closing"
            className="mt-9 inline-block rounded-full bg-white px-9 py-4 text-base font-medium text-oasis-900 shadow-lg transition hover:bg-sand-100"
          >
            Reserve your spot
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-sand-200 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-oasis-900/50 sm:flex-row">
          <div className="flex items-center gap-3">
            <Wordmark />
          </div>
          <p>Ladies only · Amman, Jordan</p>
          <div className="flex items-center gap-6">
            <Link href="/book?src=footer" className="hover:text-oasis-600">
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
