"use client";

import { useState } from "react";
import { PAYMENT_ACCOUNTS } from "@/lib/config";
import { formatDateLong, formatDateShort } from "@/lib/dates";
import type { AccountTotals, DayClose } from "@/lib/close";

function money(n: number): string {
  return `${Math.round(n * 100) / 100} JOD`;
}

function VarianceBadge({ variance }: { variance: number }) {
  if (variance === 0) {
    return <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Balanced</span>;
  }
  if (variance > 0) {
    return <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">Over by {money(variance)}</span>;
  }
  return <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-600">Short by {money(Math.abs(variance))}</span>;
}

export default function CashClose({
  initialDate,
  initialExpected,
  initialClose,
  recent,
}: {
  initialDate: string;
  initialExpected: AccountTotals;
  initialClose: DayClose | null;
  recent: DayClose[];
}) {
  const [date, setDate] = useState(initialDate);
  const [expected, setExpected] = useState<AccountTotals>(initialExpected);
  const [existing, setExisting] = useState<DayClose | null>(initialClose);
  const [counted, setCounted] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      PAYMENT_ACCOUNTS.map((a) => [a, initialClose ? String(initialClose.counted[a] ?? 0) : ""])
    )
  );
  const [notes, setNotes] = useState(initialClose?.notes ?? "");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadDate(d: string) {
    setDate(d);
    setMessage("");
    const res = await fetch(`/api/admin/close?date=${encodeURIComponent(d)}`).catch(() => null);
    if (!res || !res.ok) {
      setMessage("Could not load that day.");
      return;
    }
    const data = await res.json();
    setExpected(data.expected);
    setExisting(data.close);
    setCounted(
      Object.fromEntries(
        PAYMENT_ACCOUNTS.map((a) => [a, data.close ? String(data.close.counted[a] ?? 0) : ""])
      )
    );
    setNotes(data.close?.notes ?? "");
  }

  const countedTotal = PAYMENT_ACCOUNTS.reduce((s, a) => s + (Number(counted[a]) || 0), 0);
  const variance = Math.round((countedTotal - expected.total) * 100) / 100;

  async function submit() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          counted: Object.fromEntries(PAYMENT_ACCOUNTS.map((a) => [a, Number(counted[a]) || 0])),
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage(data?.error || "Could not save the close.");
        return;
      }
      setExisting(data.close);
      setMessage("Day closed and recorded.");
    } catch {
      setMessage("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">End of day cash close</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Count the drawer and each account, then lock the day. The system
            shows what it recorded so you can catch any difference.
          </p>
        </div>
        <div>
          <label htmlFor="close-date" className="mb-1 block text-xs font-medium text-zinc-500">Day</label>
          <input
            id="close-date"
            type="date"
            value={date}
            onChange={(e) => loadDate(e.target.value)}
            className="rounded-xl border border-oasis-950/10 bg-white px-3 py-2 text-sm outline-none focus:border-oasis-500"
          />
        </div>
      </div>

      {existing && (
        <p className="mt-4 rounded-xl bg-oasis-50 px-4 py-3 text-sm text-oasis-800">
          {formatDateLong(date)} was already closed by <strong>{existing.closed_by}</strong>.
          Re-counting will update the record.
        </p>
      )}
      {message && (
        <p className={`mt-4 rounded-xl px-4 py-3 text-sm ${message.includes("closed and recorded") ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600"}`}>
          {message}
        </p>
      )}

      {/* Reconciliation table */}
      <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200/70 text-[11px] uppercase tracking-wider text-zinc-400">
              <th className="px-5 py-3.5">Account</th>
              <th className="px-5 py-3.5">System recorded</th>
              <th className="px-5 py-3.5">Counted</th>
              <th className="px-5 py-3.5">Difference</th>
            </tr>
          </thead>
          <tbody>
            {PAYMENT_ACCOUNTS.map((a) => {
              const exp = expected[a] ?? 0;
              const cnt = Number(counted[a]) || 0;
              const diff = Math.round((cnt - exp) * 100) / 100;
              return (
                <tr key={a} className="border-b border-zinc-100">
                  <td className="px-5 py-3 font-medium">{a}</td>
                  <td className="px-5 py-3 text-zinc-600">{money(exp)}</td>
                  <td className="px-5 py-3">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0"
                      value={counted[a]}
                      onChange={(e) => setCounted((c) => ({ ...c, [a]: e.target.value }))}
                      className="w-28 rounded-lg border border-oasis-950/10 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-oasis-500"
                    />
                  </td>
                  <td className={`px-5 py-3 font-medium ${diff === 0 ? "text-zinc-400" : diff > 0 ? "text-amber-600" : "text-rose-500"}`}>
                    {diff === 0 ? "—" : `${diff > 0 ? "+" : ""}${money(diff)}`}
                  </td>
                </tr>
              );
            })}
            <tr className="bg-zinc-50 font-semibold">
              <td className="px-5 py-3.5">Total</td>
              <td className="px-5 py-3.5">{money(expected.total)}</td>
              <td className="px-5 py-3.5">{money(countedTotal)}</td>
              <td className="px-5 py-3.5"><VarianceBadge variance={variance} /></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <label htmlFor="close-notes" className="mb-1 block text-xs font-medium text-zinc-500">
            Notes <span className="font-normal text-zinc-400">(optional)</span>
          </label>
          <input
            id="close-notes"
            maxLength={500}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. 5 JOD tip in the box, one Visa slip pending"
            className="w-full rounded-xl border border-oasis-950/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-oasis-950/25"
          />
        </div>
        <button
          onClick={submit}
          disabled={saving}
          className="rounded-full bg-oasis-600 px-7 py-2.5 text-sm font-medium text-white transition hover:bg-oasis-700 disabled:opacity-40"
        >
          {saving ? "Saving…" : existing ? "Update the close" : "Close the day"}
        </button>
      </div>

      {/* History */}
      {recent.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight">Recent closes</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200/70 text-[11px] uppercase tracking-wider text-zinc-400">
                  <th className="px-5 py-3.5">Day</th>
                  <th className="px-5 py-3.5">Recorded</th>
                  <th className="px-5 py-3.5">Counted</th>
                  <th className="px-5 py-3.5">Result</th>
                  <th className="px-5 py-3.5">Closed by</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((c) => (
                  <tr key={c.date} className="border-b border-zinc-100 last:border-0">
                    <td className="px-5 py-3 font-medium">{formatDateShort(c.date)}</td>
                    <td className="px-5 py-3 text-zinc-600">{money(c.expected.total)}</td>
                    <td className="px-5 py-3 text-zinc-600">{money(c.counted.total)}</td>
                    <td className="px-5 py-3"><VarianceBadge variance={c.variance} /></td>
                    <td className="px-5 py-3 text-zinc-500">{c.closed_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
