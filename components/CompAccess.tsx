"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateShort, formatDateLong } from "@/lib/dates";
import type { CompAccess, CompAccessSummary } from "@/lib/comp";

export default function CompAccessSection({
  today,
  summary,
  entries,
}: {
  today: string;
  summary: CompAccessSummary;
  entries: CompAccess[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [people, setPeople] = useState("1");
  const [date, setDate] = useState(today);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const count = Number.parseInt(people, 10);
    if (!Number.isInteger(count) || count < 1) {
      setError("People must be a whole number of 1 or more.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/comp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          people: count,
          date,
          reason: reason.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Could not add the entry.");
        return;
      }
      setName("");
      setPeople("1");
      setDate(today);
      setReason("");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Remove this complimentary entry?")) return;
    setRemoving(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/comp/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Could not remove the entry.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <section className="mt-8 sm:mt-10">
      <h2 className="text-lg font-semibold tracking-tight">Complimentary access</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Everyone let in free — VIPs, staff guests, press. Log new entries here,
        or backfill past ones by choosing an earlier date. Each is recorded
        under your name.
      </p>

      {/* Count cards */}
      <div className="mt-4 grid grid-cols-3 gap-3 sm:max-w-xl sm:gap-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-5">
          <p className="text-xs text-zinc-500">Free entries · all time</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {summary.totalPeople}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {summary.totalEntries} {summary.totalEntries === 1 ? "entry" : "entries"}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-5">
          <p className="text-xs text-zinc-500">This month</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {summary.monthPeople}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-5">
          <p className="text-xs text-zinc-500">Today</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-teal-600 sm:text-3xl">
            {summary.todayPeople}
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-blush-100 px-4 py-3 text-sm text-blush-700">{error}</p>
      )}

      {/* Add form */}
      <form
        onSubmit={add}
        className="mt-4 grid grid-cols-2 items-end gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-oasis-950/5 sm:grid-cols-[1.5fr_auto_auto_2fr_auto]"
      >
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor="comp-name" className="mb-1 block text-xs font-medium text-zinc-500">Name</label>
          <input
            id="comp-name"
            required
            minLength={2}
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Lana (owner's guest)"
            className="w-full rounded-xl border border-oasis-950/10 bg-white px-3 py-2 text-sm outline-none focus:border-oasis-950/25"
          />
        </div>
        <div>
          <label htmlFor="comp-people" className="mb-1 block text-xs font-medium text-zinc-500">People</label>
          <input
            id="comp-people"
            type="number"
            required
            min={1}
            max={500}
            value={people}
            onChange={(e) => setPeople(e.target.value)}
            className="w-20 rounded-xl border border-oasis-950/10 bg-white px-3 py-2 text-sm outline-none focus:border-oasis-950/25"
          />
        </div>
        <div>
          <label htmlFor="comp-date" className="mb-1 block text-xs font-medium text-zinc-500">Date</label>
          <input
            id="comp-date"
            type="date"
            required
            max={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-oasis-950/10 bg-white px-3 py-2 text-sm outline-none focus:border-oasis-950/25"
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor="comp-reason" className="mb-1 block text-xs font-medium text-zinc-500">
            Reason <span className="font-normal text-zinc-400">(optional)</span>
          </label>
          <input
            id="comp-reason"
            maxLength={200}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. press visit, staff family"
            className="w-full rounded-xl border border-oasis-950/10 bg-white px-3 py-2 text-sm outline-none focus:border-oasis-950/25"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="col-span-2 rounded-full bg-oasis-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-oasis-700 disabled:opacity-40 sm:col-span-1"
        >
          {busy ? "Adding…" : "Add entry"}
        </button>
      </form>

      {/* Log */}
      <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-oasis-950/5">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200/70 text-xs uppercase tracking-wider text-zinc-500">
              <th className="px-5 py-3.5">Date</th>
              <th className="px-5 py-3.5">Guest</th>
              <th className="px-5 py-3.5">People</th>
              <th className="px-5 py-3.5">Reason</th>
              <th className="px-5 py-3.5">Logged by</th>
              <th className="px-5 py-3.5"></th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-zinc-400">
                  No complimentary entries yet.
                </td>
              </tr>
            )}
            {entries.map((c) => (
              <tr key={c.id} className="border-b border-zinc-100 last:border-0">
                <td className="whitespace-nowrap px-5 py-3 text-zinc-600" title={formatDateLong(c.date)}>
                  {formatDateShort(c.date)}
                </td>
                <td className="px-5 py-3 font-medium">{c.name}</td>
                <td className="px-5 py-3">{c.people}</td>
                <td className="px-5 py-3 text-zinc-500">{c.reason || "—"}</td>
                <td className="px-5 py-3 text-zinc-500">{c.actor_name}</td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => remove(c.id)}
                    disabled={removing === c.id}
                    className="rounded-full border border-oasis-950/10 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-40"
                  >
                    {removing === c.id ? "Removing…" : "Remove"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
