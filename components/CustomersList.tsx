"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateShort, formatDateLong } from "@/lib/dates";
import type { CustomerSummary } from "@/lib/customers";
import CustomerProfile from "@/components/CustomerProfile";

function Badge({ vip, bookings }: { vip: boolean; bookings: number }) {
  if (vip)
    return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-300">★ VIP</span>;
  if (bookings >= 2)
    return <span className="rounded-full bg-oasis-100 px-2 py-0.5 text-[11px] font-semibold text-oasis-700">Returning</span>;
  return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">New</span>;
}

export default function CustomersList({ customers }: { customers: CustomerSummary[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [profilePhone, setProfilePhone] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return customers;
    const digits = term.replace(/\D/g, "");
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (digits && c.phone.replace(/\D/g, "").includes(digits))
    );
  }, [customers, q]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {customers.length} {customers.length === 1 ? "customer" : "customers"}, ranked by
            number of bookings. Click a name for their full profile.
          </p>
        </div>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or phone…"
          className="w-64 rounded-xl border border-oasis-950/10 bg-white px-3 py-2 text-sm outline-none transition focus:border-oasis-950/25 focus:ring-4 focus:ring-oasis-500/10"
        />
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200/70 text-[11px] uppercase tracking-wider text-zinc-400">
              <th className="px-5 py-3.5">#</th>
              <th className="px-5 py-3.5">Guest</th>
              <th className="px-5 py-3.5">Phone</th>
              <th className="px-5 py-3.5">Bookings</th>
              <th className="px-5 py-3.5">Visits</th>
              <th className="px-5 py-3.5">Total spent</th>
              <th className="px-5 py-3.5">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-zinc-400">
                  {q ? "No customer matches that search." : "No customers yet."}
                </td>
              </tr>
            )}
            {filtered.map((c, i) => (
              <tr key={c.phone} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                <td className="px-5 py-3 text-zinc-400">{q ? i + 1 : i + 1}</td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setProfilePhone(c.phone)}
                      className="text-left font-medium transition hover:text-oasis-700 hover:underline"
                    >
                      {c.name}
                    </button>
                    <Badge vip={c.vip} bookings={c.bookings} />
                  </div>
                </td>
                <td className="px-5 py-3 text-zinc-500">{c.phone}</td>
                <td className="px-5 py-3 font-semibold">{c.bookings}</td>
                <td className="px-5 py-3 text-teal-600">{c.visits}</td>
                <td className="px-5 py-3 font-medium text-oasis-700">{c.totalSpent} JOD</td>
                <td className="px-5 py-3 text-zinc-500" title={c.lastSeen ? formatDateLong(c.lastSeen) : ""}>
                  {c.lastSeen ? formatDateShort(c.lastSeen) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CustomerProfile
        phone={profilePhone}
        onClose={() => setProfilePhone(null)}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
