import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { CLUB_NAME, CLUB_TAGLINE } from "@/lib/config";
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
  metadataBase: new URL("https://oasisjo.com"),
  title: {
    default: CLUB_NAME,
    template: `%s · ${CLUB_NAME}`,
  },
  description: CLUB_TAGLINE,
  openGraph: {
    title: CLUB_NAME,
    description: CLUB_TAGLINE,
    url: "https://oasisjo.com",
    siteName: CLUB_NAME,
    images: [{ url: "/images/hero.jpg", width: 1920, height: 815 }],
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable}`}>
        <PageViewTracker />
        {children}
      </body>
    </html>
  );
}
