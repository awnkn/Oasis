import Link from "next/link";
import BookingForm from "@/components/BookingForm";
import { MAX_ADVANCE_DAYS } from "@/lib/config";
import { addDays, today } from "@/lib/dates";
import { recordEvent } from "@/lib/bookings";
import { ArrowLeft } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Book Your Day",
  description:
    "Reserve a ladies only day at Oasis by Azara in Amman. Choose your date, tell us your group size, and pay at the gate. No online payment, and our team confirms every booking by phone.",
  alternates: { canonical: "/book" },
  openGraph: {
    title: "Book your day at Oasis by Azara",
    description:
      "Reserve a ladies only pool day in Amman. Takes under a minute, and you pay at the gate.",
    url: "/book",
    type: "website",
    images: [{ url: "/images/lagoon.jpg", width: 1600, height: 1067 }],
  },
};

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ src?: string }>;
}) {
  const { src } = await searchParams;
  if (typeof src === "string" && src && src.length <= 30) {
    recordEvent("book_click", src);
  }
  const todayStr = today();
  return (
    <div className="min-h-screen">
      {/* Photo header */}
      <div className="relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/lagoon.jpg"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-oasis-950/60" />
        <header className="relative z-10 mx-auto flex max-w-3xl items-center justify-between px-6 py-6 text-white">
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo-white.png"
              alt="Oasis by Azara"
              className="h-10 w-auto"
            />
          </Link>
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-white/85 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back home
          </Link>
        </header>
        <div className="relative z-10 mx-auto max-w-3xl px-6 pb-12 pt-6 text-white">
          <h1 className="font-display text-4xl font-semibold sm:text-5xl">
            Reserve your day
          </h1>
          <p className="mt-3 max-w-xl text-white/85">
            Send your request below. Our team reviews every booking and will
            call you to confirm. Nothing is charged online, and you pay at the gate.
          </p>
        </div>
      </div>

      <main id="main" className="mx-auto max-w-3xl px-6 pb-24">
        <div className="-mt-6 relative z-10">
          <BookingForm
            minDate={todayStr}
            maxDate={addDays(todayStr, MAX_ADVANCE_DAYS)}
          />
        </div>
      </main>
    </div>
  );
}
