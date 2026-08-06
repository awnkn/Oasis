import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { CLUB_NAME } from "@/lib/config";
import {
  SEO_KEYWORDS,
  SITE_DESCRIPTION,
  SITE_URL,
  businessJsonLd,
  websiteJsonLd,
} from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import PageViewTracker from "@/components/PageViewTracker";
import "./globals.css";

const display = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const body = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${CLUB_NAME} · Ladies Only Pool Retreat in Amman, Jordan`,
    template: `%s · ${CLUB_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SEO_KEYWORDS,
  applicationName: CLUB_NAME,
  authors: [{ name: CLUB_NAME }],
  creator: CLUB_NAME,
  publisher: CLUB_NAME,
  category: "Health & Beauty",
  alternates: { canonical: "/" },
  formatDetection: { telephone: false, email: false, address: false },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: `${CLUB_NAME} · A sanctuary designed around you`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: CLUB_NAME,
    images: [
      { url: "/images/hero.jpg", width: 1920, height: 815, alt: CLUB_NAME },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${CLUB_NAME} · Ladies Only Pool Retreat in Amman`,
    description: SITE_DESCRIPTION,
    images: ["/images/hero.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable}`}>
        <JsonLd data={businessJsonLd()} />
        <JsonLd data={websiteJsonLd()} />
        <PageViewTracker />
        {/* Every page renders a <main id="main">, so one skip link here covers
            the whole site. It stays off-screen until focused. */}
        <a
          href="#main"
          className="skip-link rounded-full bg-oasis-700 px-5 py-3 text-sm font-medium text-white shadow-lg"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
