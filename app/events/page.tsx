import Link from "next/link";
import type { Metadata } from "next";
import { listUpcomingEvents, remainingFor, type TicketedEvent } from "@/lib/events";
import { formatDateLong } from "@/lib/dates";
import { CURRENCY } from "@/lib/config";
import { ArrowLeft, ArrowRight } from "@/components/icons";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Events",
  description:
    "Ladies only evenings and ticketed activities at Oasis by Azara in Amman, Jordan. Live music, markets and more, beyond the daily pool day.",
  alternates: { canonical: "/events" },
  openGraph: {
    title: "Events at Oasis by Azara",
    description:
      "Ladies only evenings and ticketed activities in Amman, beyond the daily pool day.",
    url: "/events",
    type: "website",
    images: [{ url: "/images/pool.jpg", width: 1600, height: 1067 }],
  },
};

function heroUrl(e: TicketedEvent): string | null {
  return e.hero_updated_at
    ? `/api/events/${e.id}/hero?v=${encodeURIComponent(e.hero_updated_at)}`
    : null;
}

export default function EventsPage() {
  const events = listUpcomingEvents();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="relative overflow-hidden bg-oasis-950 text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/pool.jpg"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="relative z-10 mx-auto max-w-5xl px-6 py-6">
          <header className="flex items-center justify-between">
            <Link href="/">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo-white.png" alt="Oasis by Azara" className="h-10 w-auto" />
            </Link>
            <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-white/85 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
            Back home
            </Link>
          </header>
          <div className="py-16">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sand-200">
              Ladies only nights
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">
              Events at Oasis
            </h1>
            <p className="mt-3 max-w-xl text-white/85">
              Special evenings and ticketed activities, beyond the daily pool day.
            </p>
          </div>
        </div>
      </div>

      <main id="main" className="mx-auto max-w-5xl px-6 py-16">
        {events.length === 0 ? (
          <div className="rounded-3xl border border-oasis-950/10 bg-white p-12 text-center">
            <p className="font-display text-2xl font-semibold">No events right now</p>
            <p className="mt-2 text-ink-muted">
              We&apos;re planning something special. Check back soon, or{" "}
              <Link href="/book?src=events-empty" className="text-oasis-600 underline">
                book a pool day
              </Link>{" "}
              in the meantime.
            </p>
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2">
            {events.map((e) => {
              const hero = heroUrl(e);
              const remaining = remainingFor(e);
              const soldOut = remaining !== null && remaining <= 0;
              return (
                <Link
                  key={e.id}
                  href={`/events/${e.slug}`}
                  className="group overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-oasis-950/5 transition hover:shadow-lg"
                >
                  <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-oasis-800 to-oasis-950">
                    {hero && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={hero}
                        alt={e.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    )}
                    {soldOut && (
                      <span className="absolute right-4 top-4 rounded-full bg-status-critical px-3 py-1 text-xs font-semibold text-white">
                        Sold out
                      </span>
                    )}
                  </div>
                  <div className="p-6">
                    {e.tagline && (
                      <p className="text-xs font-semibold uppercase tracking-wider text-oasis-600">
                        {e.tagline}
                      </p>
                    )}
                    <h2 className="mt-1.5 font-display text-2xl font-semibold">{e.title}</h2>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
                      {e.event_date && <span>{formatDateLong(e.event_date)}</span>}
                      {e.start_time && <span>· {e.start_time}</span>}
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="font-display text-xl font-semibold text-oasis-950">
                        {e.price} {CURRENCY}
                        {e.price_note && (
                          <span className="ml-1.5 text-sm font-normal text-ink-subtle">
                            {e.price_note}
                          </span>
                        )}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-oasis-600 group-hover:underline">
                        View &amp; reserve
                      <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
