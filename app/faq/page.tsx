import Link from "next/link";
import type { Metadata } from "next";
import { CLUB_NAME, WEEKDAY_PRICE, WEEKEND_PRICE, CURRENCY } from "@/lib/config";
import { FAQ_ITEMS, SITE_URL, faqJsonLd } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import { ArrowLeft } from "@/components/icons";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description: `Answers about ${CLUB_NAME}: ladies only access, prices, booking, payment, ages, cancellations and events at our women only pool retreat in Amman, Jordan.`,
  alternates: { canonical: "/faq" },
  openGraph: {
    title: `FAQ · ${CLUB_NAME}`,
    description: `Everything you need to know before your day at ${CLUB_NAME}.`,
    url: `${SITE_URL}/faq`,
    type: "website",
    images: [{ url: "/images/hero.jpg", width: 1920, height: 815 }],
  },
};

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-sand-50/40">
      <JsonLd data={faqJsonLd()} />

      {/* Header */}
      <div className="bg-oasis-950 text-white">
        <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo-white.png" alt={CLUB_NAME} className="h-9 w-auto" />
          </Link>
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-white/85 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back home
          </Link>
        </header>
        <div className="mx-auto max-w-3xl px-6 pb-14 pt-10">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sand-200">
            Good to know
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">
            Frequently asked questions
          </h1>
          <p className="mt-3 max-w-xl text-white/85">
            Everything you need before your day at {CLUB_NAME}. Still curious?
            Send a booking request and our team will call you.
          </p>
        </div>
      </div>

      {/* Questions */}
      <main id="main" className="mx-auto max-w-3xl px-6 py-14">
        <div className="divide-y divide-oasis-950/10 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-oasis-950/5">
          {FAQ_ITEMS.map((item, i) => (
            <details key={i} className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden" open={i === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-semibold text-oasis-950">
                {item.q}
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mist-100 text-mist-600 transition group-open:rotate-45">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
              </summary>
              <p className="mt-3 text-ink-muted leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>

        {/* Quick facts + CTA */}
        <div className="mt-10 rounded-3xl bg-mist-50 p-8 text-center ring-1 ring-mist-200">
          <p className="font-display text-2xl font-semibold text-oasis-950">
            Ready for a slow, sunlit day?
          </p>
          <p className="mt-2 text-ink-muted">
            {WEEKDAY_PRICE} {CURRENCY} on weekdays, {WEEKEND_PRICE} {CURRENCY} on
            weekends. One price, all day, and you pay at the gate.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/book?src=faq"
              className="rounded-full bg-oasis-600 px-7 py-3 text-sm font-medium text-white transition hover:bg-oasis-700"
            >
              Book your day
            </Link>
            <Link
              href="/events"
              className="rounded-full border border-oasis-300 px-7 py-3 text-sm font-medium text-oasis-700 transition hover:bg-white"
            >
              See events
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
