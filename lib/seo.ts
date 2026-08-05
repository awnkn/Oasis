// Central SEO helpers: canonical site URL, keywords, and JSON-LD
// structured-data builders (LocalBusiness, WebSite, FAQ, Event).

import {
  AGE_GUARDIAN,
  AGE_MONDAY,
  AGE_OTHER_DAYS,
  CLUB_NAME,
  CURRENCY,
  WEEKDAY_PRICE,
  WEEKEND_PRICE,
} from "./config";
import type { TicketedEvent } from "./events";

export const SITE_URL =
  process.env.SITE_URL?.replace(/\/$/, "") || "https://oasisjo.com";

export const SITE_DESCRIPTION =
  `${CLUB_NAME} is a ladies only pool retreat in Amman, Jordan. Sunlit pools, ` +
  `complete privacy and slow days, designed exclusively for women, at every hour. ` +
  `Book your day in under a minute and pay at the gate.`;

export const SEO_KEYWORDS = [
  "ladies only pool Amman",
  "women only swimming Jordan",
  "ladies pool Amman",
  "women only pool retreat Jordan",
  "ladies day out Amman",
  "private pool for women Amman",
  "ladies only spa Amman",
  "women swimming Amman",
  "ladies pool day Jordan",
  "Oasis by Azara",
];

const AMMAN_ADDRESS = {
  "@type": "PostalAddress",
  addressLocality: "Amman",
  addressCountry: "JO",
};

/** LocalBusiness / health-and-beauty entity for the whole site. */
export function businessJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": ["HealthAndBeautyBusiness", "LocalBusiness"],
    "@id": `${SITE_URL}/#business`,
    name: CLUB_NAME,
    alternateName: "Oasis",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    image: `${SITE_URL}/images/hero.jpg`,
    logo: `${SITE_URL}/images/logo-black.png`,
    priceRange: `${WEEKDAY_PRICE} to ${WEEKEND_PRICE} ${CURRENCY}`,
    currenciesAccepted: CURRENCY,
    paymentAccepted: "Cash, CliQ, Visa",
    address: AMMAN_ADDRESS,
    areaServed: { "@type": "City", name: "Amman" },
    audience: { "@type": "PeopleAudience", suggestedGender: "female" },
    slogan: "A sanctuary designed around you.",
    sameAs: [SITE_URL],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: CLUB_NAME,
    url: SITE_URL,
    inLanguage: "en",
    publisher: { "@id": `${SITE_URL}/#business` },
  };
}

// ---------- FAQ (shared by the page and its structured data) ----------

export interface FaqItem {
  q: string;
  a: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    q: "Is Oasis really ladies only?",
    a: `Yes. ${CLUB_NAME} is exclusively for women, every hour of every day, with no exceptions. Interior spaces have no cameras, so your privacy stays complete.`,
  },
  {
    q: "Where is Oasis located?",
    a: "Oasis is a ladies only pool retreat in Amman, Jordan.",
  },
  {
    q: "How much is entry?",
    a: `Entry is ${WEEKDAY_PRICE} ${CURRENCY} per guest on weekdays (Sunday to Thursday) and ${WEEKEND_PRICE} ${CURRENCY} on weekends (Friday and Saturday). One price covers the full day.`,
  },
  {
    q: "How do I book a day at Oasis?",
    a: "Send a booking request online in under a minute. Our team reviews every request and calls you to confirm. Nothing is charged online, and you pay at the gate.",
  },
  {
    q: "How do I pay?",
    a: "You pay at the entrance. There is no online payment. We accept Cash, CliQ and Visa at the gate.",
  },
  {
    q: "Is there an age policy?",
    a: `Mondays welcome ladies aged ${AGE_MONDAY} and above, and every other day is for ages ${AGE_OTHER_DAYS} and above. Guests under ${AGE_GUARDIAN} join with a guardian aged ${AGE_GUARDIAN} and above.`,
  },
  {
    q: "Can I change or cancel my booking?",
    a: "Changes must be made at least 24 hours before your reservation. A booking cancelled in time can be transferred to a new date. Same day cancellations and no shows result in the loss of the booking.",
  },
  {
    q: "Will the pools be crowded?",
    a: "No. Entry is capped every single day, so your calm is always protected.",
  },
  {
    q: "Can I reserve a specific spot or seat?",
    a: "Seating at all pool areas, including the Shisha Pool, is available on a first come, first served basis and cannot be reserved or guaranteed.",
  },
  {
    q: "Does Oasis host events?",
    a: "Yes. Beyond the daily pool day we host ladies only evenings and ticketed activities. See the Events page for what is coming up.",
  },
];

export function faqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

// ---------- Event structured data ----------

export function eventJsonLd(event: TicketedEvent) {
  const url = `${SITE_URL}/events/${event.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    ...(event.event_date ? { startDate: event.event_date } : {}),
    description: event.description || event.tagline || SITE_DESCRIPTION,
    ...(event.hero_updated_at
      ? { image: `${SITE_URL}/api/events/${event.id}/hero` }
      : { image: `${SITE_URL}/images/hero.jpg` }),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: event.location || CLUB_NAME,
      address: AMMAN_ADDRESS,
    },
    organizer: { "@type": "Organization", name: CLUB_NAME, url: SITE_URL },
    offers: {
      "@type": "Offer",
      price: event.price,
      priceCurrency: CURRENCY,
      availability: "https://schema.org/InStock",
      url,
    },
  };
}
