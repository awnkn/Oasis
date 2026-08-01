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
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/" className="font-display text-2xl font-semibold tracking-wide">
          Oasis <span className="text-oasis-500">·</span>{" "}
          <span className="text-oasis-600">واحة السيدات</span>
        </Link>
        <Link href="/" className="text-sm font-medium text-oasis-800 hover:text-oasis-600">
          ← Back home
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-24 pt-6">
        <h1 className="font-display text-4xl font-semibold sm:text-5xl">
          Reserve your day
        </h1>
        <p className="mt-3 max-w-xl text-oasis-900/60">
          Send your request below — our team reviews every booking and will call
          you to confirm. Nothing is charged online; you pay at the gate.
        </p>
        <div className="mt-10">
          <BookingForm
            minDate={todayStr}
            maxDate={addDays(todayStr, MAX_ADVANCE_DAYS)}
          />
        </div>
      </main>
    </div>
  );
}
