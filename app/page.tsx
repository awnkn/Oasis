import Link from "next/link";
import {
  AGE_GUARDIAN,
  AGE_MONDAY,
  AGE_OTHER_DAYS,
  CLUB_NAME,
  CURRENCY,
  NIGHT_SWIM_PRICE,
  NIGHT_SWIM_TIME,
  WEEKDAY_PRICE,
  WEEKEND_PRICE,
} from "@/lib/config";
import { listUpcomingEvents } from "@/lib/events";
import { eventHeroUrl } from "@/lib/eventHero";
import { formatDateLong } from "@/lib/dates";

export const dynamic = "force-dynamic";

// Soft outline icons for the features section (thin stroke, rounded caps).
const iconProps = {
  width: 28,
  height: 28,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const FEATURE_ICONS = {
  // Ladies only — a single figure
  ladies: (
    <svg {...iconProps}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </svg>
  ),
  // No cameras — camera with a slash
  privacy: (
    <svg {...iconProps}>
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2L8 5h5l.7 1" />
      <path d="M21 8v9.5a1.5 1.5 0 0 1-1.5 1.5H6" />
      <path d="M9.2 10.4A3 3 0 0 0 12 15a3 3 0 0 0 2.3-1.1" />
      <path d="M4 4l16 16" />
    </svg>
  ),
  // Never crowded — a small calm group
  calm: (
    <svg {...iconProps}>
      <circle cx="9" cy="8" r="2.8" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.6a2.8 2.8 0 0 1 0 5.2" />
      <path d="M17.2 13.6a5.5 5.5 0 0 1 3.3 5.4" />
    </svg>
  ),
  // Pools — water waves
  pools: (
    <svg {...iconProps}>
      <path d="M2 8c1.8 0 1.8 1.4 3.7 1.4S7.5 8 9.3 8s1.8 1.4 3.7 1.4S14.8 8 16.6 8s1.8 1.4 3.7 1.4" />
      <path d="M2 13c1.8 0 1.8 1.4 3.7 1.4S7.5 13 9.3 13s1.8 1.4 3.7 1.4S14.8 13 16.6 13s1.8 1.4 3.7 1.4" />
      <path d="M2 18c1.8 0 1.8 1.4 3.7 1.4S7.5 18 9.3 18s1.8 1.4 3.7 1.4S14.8 18 16.6 18s1.8 1.4 3.7 1.4" />
    </svg>
  ),
  // Book in a minute — clock
  quick: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </svg>
  ),
  // Confirmed instantly — check inside a circle
  confirmed: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.2l2.3 2.3 4.7-4.8" />
    </svg>
  ),
};

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
  const events = listUpcomingEvents().slice(0, 3);
  return (
    <div className="min-h-screen">
      <main>
      {/* Hero */}
      <section className="relative flex min-h-[92svh] flex-col overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hero.jpg"
          alt="The pool at golden hour"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Readability: a deep vertical gradient plus a soft scrim pooled
            behind the centred text. */}
        <div className="absolute inset-0 bg-gradient-to-b from-oasis-950/75 via-oasis-950/55 to-oasis-950/90" />
        <div className="absolute inset-0 [background:radial-gradient(ellipse_60%_50%_at_50%_50%,_rgba(16,44,48,0.55)_0%,_transparent_75%)]" />

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
            Ladies only · Every hour of every day
          </p>
          <h1 className="max-w-4xl font-display text-4xl font-semibold leading-[1.12] [text-shadow:0_2px_30px_rgba(0,0,0,0.4)] sm:text-6xl lg:text-7xl">
            A sanctuary designed around&nbsp;you.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-white/90 [text-shadow:0_1px_16px_rgba(0,0,0,0.35)]">
            Sunlit pools, complete privacy and slow days, made for women
            only, at every hour.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/book?src=hero"
              className="rounded-full bg-oasis-500 px-8 py-3.5 text-base font-medium text-white shadow-lg transition hover:bg-oasis-400"
            >
              Reserve your day
            </Link>
            <a
              href="#good-to-know"
              className="rounded-full border border-white/50 bg-white/10 px-8 py-3.5 text-base font-medium text-white backdrop-blur transition hover:bg-white/20"
            >
              What to know
            </a>
          </div>
          <p className="mt-5 text-sm text-white/75">
            Takes under a minute · No online payment · Pay at the gate
          </p>
        </div>

        <div className="relative z-10 border-t border-white/15 bg-oasis-950/40 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-2 px-6 py-4 text-sm text-white/85">
            <span>Sunday to Thursday · {WEEKDAY_PRICE} {CURRENCY} per guest</span>
            <span className="hidden text-white/30 sm:block">✦</span>
            <span>Friday & Saturday · {WEEKEND_PRICE} {CURRENCY} per guest</span>
            <span className="hidden text-white/30 sm:block">✦</span>
            <span>🌙 Thursday night swim · {NIGHT_SWIM_PRICE} {CURRENCY}</span>
          </div>
        </div>
      </section>

      {/* Good to know — the answers to what people usually message us about */}
      <section id="good-to-know" className="border-y border-oasis-950/5 bg-white px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sand-600">
              Before you come
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">
              Good to know
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-oasis-900/60">
              Everything you might ask, answered here — so you can just pick a
              day and come.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {/* Ages — front and centre */}
            <div className="rounded-3xl border border-blush-200 bg-blush-100/50 p-7">
              <p className="text-xs font-semibold uppercase tracking-widest text-blush-700">
                Ages
              </p>
              <h3 className="mt-2 font-display text-2xl font-semibold">
                Who can visit
              </h3>
              <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-oasis-900/75">
                <li>· <strong>Mondays</strong> — ladies {AGE_MONDAY} and above</li>
                <li>· <strong>Every other day</strong> — ages {AGE_OTHER_DAYS}+</li>
                <li>· Under {AGE_GUARDIAN} join with a guardian aged {AGE_GUARDIAN}+</li>
              </ul>
            </div>

            {/* Ladies only */}
            <div className="rounded-3xl bg-sand-50 p-7 ring-1 ring-oasis-950/5">
              <p className="text-xs font-semibold uppercase tracking-widest text-oasis-500">
                Privacy
              </p>
              <h3 className="mt-2 font-display text-2xl font-semibold">
                Ladies only, always
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-oasis-900/70">
                Every hour of every day — no “family times”, ever. No cameras
                inside, so you can be completely at ease.
              </p>
            </div>

            {/* Prices */}
            <div className="rounded-3xl bg-sand-50 p-7 ring-1 ring-oasis-950/5">
              <p className="text-xs font-semibold uppercase tracking-widest text-oasis-500">
                Day pass
              </p>
              <h3 className="mt-2 font-display text-2xl font-semibold">
                {WEEKDAY_PRICE} / {WEEKEND_PRICE} {CURRENCY}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-oasis-900/70">
                {WEEKDAY_PRICE} {CURRENCY} Sunday–Thursday, {WEEKEND_PRICE}{" "}
                {CURRENCY} Friday &amp; Saturday. Per guest, all day long.
              </p>
            </div>

            {/* Night swim */}
            <div className="rounded-3xl bg-oasis-950 p-7 text-white">
              <p className="text-xs font-semibold uppercase tracking-widest text-oasis-300">
                🌙 New · Thursdays
              </p>
              <h3 className="mt-2 font-display text-2xl font-semibold">
                Night swim
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-white/75">
                Thursday evenings, {NIGHT_SWIM_TIME}. A flat {NIGHT_SWIM_PRICE}{" "}
                {CURRENCY} per guest — choose it when you book.
              </p>
            </div>

            {/* Payment */}
            <div className="rounded-3xl bg-sand-50 p-7 ring-1 ring-oasis-950/5">
              <p className="text-xs font-semibold uppercase tracking-widest text-oasis-500">
                Booking &amp; payment
              </p>
              <h3 className="mt-2 font-display text-2xl font-semibold">
                Pay at the gate
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-oasis-900/70">
                Nothing is charged online. Book in a minute, get an instant
                confirmation, and pay by cash or CliQ when you arrive.
              </p>
            </div>

            {/* Calm */}
            <div className="rounded-3xl bg-sand-50 p-7 ring-1 ring-oasis-950/5">
              <p className="text-xs font-semibold uppercase tracking-widest text-oasis-500">
                The space
              </p>
              <h3 className="mt-2 font-display text-2xl font-semibold">
                Never crowded
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-oasis-900/70">
                Guest numbers are capped every single day, so the pools stay
                calm and the day stays yours.
              </p>
            </div>
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/faq"
              className="text-sm font-medium text-oasis-600 underline-offset-4 hover:underline"
            >
              More questions? Read the FAQ →
            </Link>
          </div>
        </div>
      </section>

      {/* Upcoming events */}
      {events.length > 0 && (
        <section id="events" className="border-b border-oasis-950/5 bg-sand-100 px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sand-600">
                  Beyond the pool day
                </p>
                <h2 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">
                  Upcoming events
                </h2>
              </div>
              <Link
                href="/events"
                className="rounded-full border border-oasis-300 px-6 py-2.5 text-sm font-medium text-oasis-700 transition hover:border-oasis-500 hover:bg-white"
              >
                See all events →
              </Link>
            </div>

            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {events.map((e) => {
                const hero = eventHeroUrl(e);
                return (
                  <Link
                    key={e.id}
                    href={`/events/${e.slug}`}
                    className="group overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-oasis-950/5 transition hover:shadow-lg"
                  >
                    <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-oasis-700 to-oasis-950">
                      {hero && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={hero}
                          alt={e.title}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      )}
                    </div>
                    <div className="p-6">
                      <h3 className="font-display text-2xl font-semibold">{e.title}</h3>
                      {e.event_date && (
                        <p className="mt-2 text-sm text-oasis-900/60">
                          {formatDateLong(e.event_date)}
                          {e.start_time ? ` · ${e.start_time}` : ""}
                        </p>
                      )}
                      <p className="mt-4 font-medium text-oasis-600 group-hover:underline">
                        {e.price} {CURRENCY} · Reserve →
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Brand moment — the sand mark sits on top of the words */}
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <div className="mx-auto mb-10 w-full max-w-xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/sand-logo.jpg"
            alt="The Oasis by Azara mark pressed into golden sand"
            className="aspect-[4/5] w-full rounded-3xl object-cover shadow-xl ring-1 ring-sand-200"
          />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sand-600">
          More than relaxation
        </p>
        <h2 className="mt-4 font-display text-4xl font-semibold leading-tight sm:text-5xl">
          A place you return to, slowly.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-oasis-900/70">
          Every corner of {CLUB_NAME} is shaped around one thing: your ease,
          without compromise. Complete privacy in every space, so each moment
          feels lighter, freer and wholly your own.
        </p>
        <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-oasis-900/70">
          Caring for yourself is not a luxury saved for special occasions. It
          is a rhythm worth returning to, again and again.
        </p>
        <Link
          href="/book?src=story"
          className="mt-8 inline-block rounded-full bg-oasis-600 px-7 py-3 font-medium text-white shadow-md transition hover:bg-oasis-700"
        >
          Book your visit
        </Link>
      </section>

      {/* Why Oasis */}
      <section className="border-y border-oasis-950/5 bg-white px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center font-display text-4xl font-semibold sm:text-5xl">
            Why women choose Oasis
          </h2>
          <div className="mx-auto mt-14 grid max-w-5xl gap-x-12 gap-y-11 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: FEATURE_ICONS.ladies,
                title: "Ladies only. Always.",
                text: "Every hour of every day, no exceptions, no “family times”.",
              },
              {
                icon: FEATURE_ICONS.privacy,
                title: "No cameras inside",
                text: "Complete privacy in every interior space, so you can be fully at ease.",
              },
              {
                icon: FEATURE_ICONS.calm,
                title: "Never crowded",
                text: "Entry is capped every single day, so your calm is protected.",
              },
              {
                icon: FEATURE_ICONS.pools,
                title: "Pools for every mood",
                text: "Sunlit lagoons, still water, shaded corners, choose by feeling.",
              },
              {
                icon: FEATURE_ICONS.quick,
                title: "Book in a minute",
                text: "No online payment, no cards. Reserve now, pay at the gate.",
              },
              {
                icon: FEATURE_ICONS.confirmed,
                title: "Confirmed instantly",
                text: "Your spot is confirmed the moment you book, by email and WhatsApp.",
              },
            ].map((point) => (
              <div key={point.title} className="border-t border-oasis-950/10 pt-6">
                <div className="text-oasis-600">{point.icon}</div>
                <h3 className="mt-4 font-display text-xl font-semibold">
                  {point.title}
                </h3>
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
            Book your spot
          </h2>
          <p className="mt-3 text-center text-oasis-900/60">
            One price per guest. Swim, lounge and unwind from open to close.
          </p>
          <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
            <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-oasis-950/5">
              <p className="text-sm font-semibold uppercase tracking-widest text-oasis-500">
                Weekdays
              </p>
              <p className="mt-1 text-sm text-oasis-900/50">Sunday to Thursday</p>
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

          {/* Night swim — the Thursday-evening option */}
          <div className="mx-auto mt-6 flex max-w-3xl flex-col items-center justify-between gap-4 rounded-3xl bg-oasis-950 px-7 py-6 text-white sm:flex-row sm:text-left">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-oasis-300">
                🌙 Night swim · Thursdays
              </p>
              <p className="mt-2 text-lg">
                <span className="font-display text-3xl font-semibold">
                  {NIGHT_SWIM_PRICE} <span className="text-xl text-oasis-300">{CURRENCY}</span>
                </span>{" "}
                <span className="text-white/70">per guest · {NIGHT_SWIM_TIME}</span>
              </p>
            </div>
            <Link
              href="/book?src=pricing-night"
              className="shrink-0 rounded-full bg-white/95 px-6 py-2.5 text-sm font-medium text-oasis-900 transition hover:bg-white"
            >
              Book a night swim
            </Link>
          </div>

          {/* Age note */}
          <div className="mx-auto mt-8 max-w-3xl rounded-3xl border border-blush-200 bg-blush-100/60 px-7 py-5 text-center">
            <p className="text-sm leading-relaxed text-oasis-900/80">
              <span className="mr-1.5">🌸</span>
              <strong className="font-semibold">A little note on ages.</strong>{" "}
              Mondays welcome ladies {AGE_MONDAY}+, every other day is for ages{" "}
              {AGE_OTHER_DAYS}+, and guests under {AGE_GUARDIAN} join with a
              guardian aged {AGE_GUARDIAN}+.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-sand-100 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-display text-4xl font-semibold">
            How booking works
          </h2>
          <div className="mx-auto mt-12 grid max-w-4xl gap-8 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "Book your day",
                text: "Choose a date, tell us how many guests are coming, and book in under a minute.",
              },
              {
                step: "2",
                title: "Confirmed instantly",
                text: "Your booking is confirmed right away, with a confirmation by email and WhatsApp and a reminder the day before.",
              },
              {
                step: "3",
                title: "Enjoy the oasis",
                text: "Arrive, check in with your name, and the day is yours. Guest numbers are limited daily for your comfort.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white font-display text-xl font-semibold text-oasis-900 shadow-sm ring-1 ring-oasis-950/10">
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
            Pick your day, and we’ll hold the calm for you.
          </p>
          <Link
            href="/book?src=closing"
            className="mt-9 inline-block rounded-full bg-white px-9 py-4 text-base font-medium text-oasis-900 shadow-lg transition hover:bg-sand-100"
          >
            Reserve your spot
          </Link>
        </div>
      </section>
      </main>

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
            <Link href="/events" className="hover:text-oasis-600">
              Events
            </Link>
            <Link href="/faq" className="hover:text-oasis-600">
              FAQ
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
