import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getEventBySlug, remainingFor, type TicketedEvent } from "@/lib/events";
import { today, formatDateLong } from "@/lib/dates";
import { CURRENCY } from "@/lib/config";
import EventReservationForm from "@/components/EventReservationForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  return { title: event ? `${event.title} — Oasis` : "Event — Oasis" };
}

function heroUrl(e: TicketedEvent): string | null {
  return e.hero_updated_at
    ? `/api/events/${e.id}/hero?v=${encodeURIComponent(e.hero_updated_at)}`
    : null;
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  if (!event || !event.active) notFound();
  if (event.event_date && event.event_date < today()) notFound();

  const hero = heroUrl(event);
  const remaining = remainingFor(event);
  const soldOut = remaining !== null && remaining <= 0;
  const paragraphs = (event.description ?? "").split(/\n{2,}/).filter(Boolean);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden bg-oasis-950">
        {hero ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hero}
            alt={event.title}
            className="absolute inset-0 h-full w-full object-cover opacity-70"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-oasis-700 to-oasis-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-oasis-950/90 via-oasis-950/40 to-oasis-950/50" />

        <div className="relative z-10 mx-auto max-w-4xl px-6">
          <header className="flex items-center justify-between py-6 text-white">
            <Link href="/">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo-white.png" alt="Oasis by Azara" className="h-10 w-auto" />
            </Link>
            <Link href="/events" className="text-sm font-medium text-white/85 hover:text-white">
              ← All events
            </Link>
          </header>
          <div className="pb-14 pt-24 text-white">
            {event.tagline && (
              <p className="text-sm font-medium uppercase tracking-[0.25em] text-sand-200">
                {event.tagline}
              </p>
            )}
            <h1 className="mt-3 font-display text-4xl font-semibold sm:text-6xl">
              {event.title}
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-white/90">
              {event.event_date && (
                <span className="rounded-full bg-white/15 px-4 py-1.5 text-sm backdrop-blur">
                  {formatDateLong(event.event_date)}
                </span>
              )}
              {event.start_time && (
                <span className="rounded-full bg-white/15 px-4 py-1.5 text-sm backdrop-blur">
                  {event.start_time}
                </span>
              )}
              {event.location && (
                <span className="rounded-full bg-white/15 px-4 py-1.5 text-sm backdrop-blur">
                  {event.location}
                </span>
              )}
              <span className="rounded-full bg-oasis-500 px-4 py-1.5 text-sm font-semibold">
                {event.price} {CURRENCY}
                {event.price_note ? ` · ${event.price_note}` : ""}
              </span>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto grid max-w-5xl gap-12 px-6 py-16 lg:grid-cols-[1fr_minmax(360px,420px)]">
        {/* Details */}
        <div>
          {paragraphs.map((p, i) => (
            <p
              key={i}
              className="mb-4 whitespace-pre-line text-lg leading-relaxed text-oasis-900/75"
            >
              {p}
            </p>
          ))}

          {event.highlights.length > 0 && (
            <div className="mt-8">
              <h2 className="font-display text-xl font-semibold">
                What&apos;s waiting for you
              </h2>
              <ul className="mt-4 space-y-2.5">
                {event.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-3 text-oasis-900/80">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-oasis-500" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Reservation */}
        <div className="lg:sticky lg:top-8 lg:self-start">
          <EventReservationForm eventId={event.id} price={event.price} soldOut={soldOut} />
        </div>
      </main>
    </div>
  );
}
