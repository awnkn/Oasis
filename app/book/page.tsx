import Link from "next/link";
import BookingForm from "@/components/BookingForm";
import { MAX_ADVANCE_DAYS } from "@/lib/config";
import { addDays, today } from "@/lib/dates";

export const dynamic = "force-dynamic";

export const metadata = { title: "Book your day" };

export default function BookPage() {
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
          <Link href="/" className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-semibold lowercase tracking-wide">
              oasis
            </span>
            <span className="text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-white/70">
              by Azara
            </span>
          </Link>
          <Link href="/" className="text-sm font-medium text-white/85 hover:text-white">
            ← Back home
          </Link>
        </header>
        <div className="relative z-10 mx-auto max-w-3xl px-6 pb-12 pt-6 text-white">
          <h1 className="font-display text-4xl font-semibold sm:text-5xl">
            Reserve your day
          </h1>
          <p className="mt-3 max-w-xl text-white/85">
            Send your request below — our team reviews every booking and will
            call you to confirm. Nothing is charged online; you pay at the gate.
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-6 pb-24">
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
