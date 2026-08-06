import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getEventBySlug, remainingFor, type TicketedEvent } from "@/lib/events";
import { today, formatDateLong } from "@/lib/dates";
import { CURRENCY } from "@/lib/config";
import { eventJsonLd } from "@/lib/seo";
import EventReservationForm from "@/components/EventReservationForm";
import JsonLd from "@/components/JsonLd";
import { ArrowLeft, ArrowRight, Calendar, MapPin, Ticket } from "@/components/icons";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  if (!event) return { title: "Event" };
  const desc =
    event.tagline ||
    (event.description ?? "").split(/\n{2,}/)[0] ||
    `A ladies only event at Oasis by Azara in Amman.`;
  const img = event.hero_updated_at
    ? `/api/events/${event.id}/hero`
    : "/images/hero.jpg";
  return {
    title: event.title,
    description: desc.slice(0, 200),
    alternates: { canonical: `/events/${event.slug}` },
    openGraph: {
      title: event.title,
      description: desc.slice(0, 200),
      url: `/events/${event.slug}`,
      type: "website",
      images: [{ url: img }],
    },
  };
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
    <div className="min-h-screen bg-mist-100/40">
      <JsonLd data={eventJsonLd(event)} />

      {/* Top bar */}
      <div className="bg-oasis-950">
        <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5 text-white">
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo-white.png" alt="Oasis by Azara" className="h-9 w-auto" />
          </Link>
          <Link href="/events" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-white/85 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            All events
          </Link>
        </header>
      </div>

      {/* Flyer + title */}
      <div className="mx-auto max-w-5xl px-6 pt-10">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-gradient-to-br from-oasis-700 to-oasis-950 shadow-lg ring-1 ring-oasis-950/10">
            {hero ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hero} alt={event.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center p-8 text-center font-display text-2xl font-semibold text-white/85">
                {event.title}
              </div>
            )}
          </div>

          <div>
            {event.tagline && (
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-oasis-600">
                {event.tagline}
              </p>
            )}
            <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">
              {event.title}
            </h1>
            <div className="mt-6 space-y-2.5 text-ink">
              {event.event_date && (
                <p className="flex items-center gap-2.5">
                  <Calendar className="h-4.5 w-4.5 shrink-0 text-oasis-600" />
                  {formatDateLong(event.event_date)}
                  {event.start_time ? ` · ${event.start_time}` : ""}
                </p>
              )}
              {event.location && (
                <p className="flex items-center gap-2.5">
                  <MapPin className="h-4.5 w-4.5 shrink-0 text-oasis-600" />
                  {event.location}
                </p>
              )}
              <p className="flex items-center gap-2.5">
                <Ticket className="h-4.5 w-4.5 shrink-0 text-oasis-600" />
                <span className="font-semibold text-oasis-950">
                  {event.price} {CURRENCY}
                </span>
                {event.price_note ? (
                  <span className="text-ink-muted">· {event.price_note}</span>
                ) : null}
              </p>
            </div>
            <a
              href="#reserve"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-oasis-600 px-7 py-3 text-sm font-medium text-white shadow-md transition hover:bg-oasis-700"
            >
              Reserve your spot
                <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Details + reservation */}
      <main id="main" className="mx-auto grid max-w-5xl gap-12 px-6 py-14 lg:grid-cols-[1fr_minmax(360px,420px)]">
        <div>
          {paragraphs.map((p, i) => (
            <p
              key={i}
              className="mb-4 whitespace-pre-line text-lg leading-relaxed text-ink"
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
                  <li key={i} className="flex items-start gap-3 text-ink">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-oasis-500" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div id="reserve" className="scroll-mt-8 lg:sticky lg:top-8 lg:self-start">
          <EventReservationForm eventId={event.id} price={event.price} soldOut={soldOut} />
        </div>
      </main>
    </div>
  );
}
