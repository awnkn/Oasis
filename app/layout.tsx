import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { CLUB_NAME, CLUB_TAGLINE } from "@/lib/config";
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
  title: {
    default: CLUB_NAME,
    template: `%s · ${CLUB_NAME}`,
  },
  description: CLUB_TAGLINE,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable}`}>{children}</body>
    </html>
  );
}
