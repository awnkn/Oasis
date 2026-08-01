import Link from "next/link";
import { redirect } from "next/navigation";
import CsvButton from "@/components/CsvButton";
import { getAdminRole } from "@/lib/auth";
import {
  getInsights,
  type DailyAccountingRow,
} from "@/lib/bookings";
import { formatDateShort, today } from "@/lib/dates";

export const dynamic = "force-dynamic";

export const metadata = { title: "Insights" };

const STATUS_COLORS: Record<string, string> = {
  approved: "#33999c",
  pending: "#d9a23b",
  rejected: "#d17b90",
};

function sum(rows: DailyAccountingRow[], key: keyof DailyAccountingRow): number {
  return rows.reduce((acc, r) => acc + (r[key] as number), 0);
}

function BarChart({
  rows,
  value,
  color,
}: {
  rows: DailyAccountingRow[];
  value: (r: DailyAccountingRow) => number;
  color: string;
}) {
  const W = 720;
  const H = 170;
  const pad = 4;
  const max = Math.max(1, ...rows.map(value));
  const bw = (W - pad * 2) / rows.length;
  return (
    <svg viewBox={`0 0 ${W} ${H + 22}`} className="w-full">
      {rows.map((r, i) => {
        const v = value(r);
        const h = (v / max) * H;
        return (
          <rect
            key={r.date}
            x={pad + i * bw + 1}
            y={H - h}
            width={Math.max(2, bw - 3)}
            height={Math.max(v > 0 ? 2 : 0, h)}
            rx={2.5}
            fill={color}
            opacity={v > 0 ? 0.9 : 0.15}
          >
            <title>{`${formatDateShort(r.date)}: ${v}`}</title>
          </rect>
        );
      })}
      <text x={pad} y={H + 16} fontSize={11} fill="#22454a" opacity={0.55}>
        {formatDateShort(rows[0].date)}
      </text>
      <text
        x={W - pad}
        y={H + 16}
        fontSize={11}
        fill="#22454a"
        opacity={0.55}
        textAnchor="end"
      >
        {formatDateShort(rows[rows.length - 1].date)}
      </text>
      <text x={W - pad} y={12} fontSize={11} fill="#22454a" opacity={0.55} textAnchor="end">
        peak {max}
      </text>
    </svg>
  );
}

function RevenueChart({ rows }: { rows: DailyAccountingRow[] }) {
  const W = 720;
  const H = 170;
  const pad = 4;
  const max = Math.max(1, ...rows.map((r) => Math.max(r.expectedRevenue, r.collected)));
  const bw = (W - pad * 2) / rows.length;
  return (
    <svg viewBox={`0 0 ${W} ${H + 22}`} className="w-full">
      {rows.map((r, i) => {
        const he = (r.expectedRevenue / max) * H;
        const hc = (r.collected / max) * H;
        const x = pad + i * bw;
        const w = Math.max(2, (bw - 4) / 2);
        return (
          <g key={r.date}>
            <rect x={x + 1} y={H - he} width={w} height={Math.max(r.expectedRevenue > 0 ? 2 : 0, he)} rx={2} fill="#245257" opacity={r.expectedRevenue > 0 ? 0.9 : 0.12}>
              <title>{`${formatDateShort(r.date)} approved: ${r.expectedRevenue} JOD`}</title>
            </rect>
            <rect x={x + 2 + w} y={H - hc} width={w} height={Math.max(r.collected > 0 ? 2 : 0, hc)} rx={2} fill="#c59c63" opacity={r.collected > 0 ? 0.95 : 0.12}>
              <title>{`${formatDateShort(r.date)} collected: ${r.collected} JOD`}</title>
            </rect>
          </g>
        );
      })}
      <text x={pad} y={H + 16} fontSize={11} fill="#22454a" opacity={0.55}>
        {formatDateShort(rows[0].date)}
      </text>
      <text x={W - pad} y={H + 16} fontSize={11} fill="#22454a" opacity={0.55} textAnchor="end">
        {formatDateShort(rows[rows.length - 1].date)}
      </text>
      <text x={W - pad} y={12} fontSize={11} fill="#22454a" opacity={0.55} textAnchor="end">
        peak {max} JOD
      </text>
    </svg>
  );
}

function Donut({ segments }: { segments: { label: string; count: number; color: string }[] }) {
  const total = Math.max(1, segments.reduce((a, s) => a + s.count, 0));
  const R = 52;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0">
        <circle cx={70} cy={70} r={R} fill="none" stroke="#f6f0e4" strokeWidth={22} />
        {segments.map((s) => {
          const frac = s.count / total;
          const el = (
            <circle
              key={s.label}
              cx={70}
              cy={70}
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={22}
              strokeDasharray={`${frac * C} ${C}`}
              strokeDashoffset={-offset * C}
              transform="rotate(-90 70 70)"
            >
              <title>{`${s.label}: ${s.count}`}</title>
            </circle>
          );
          offset += frac;
          return el;
        })}
      </svg>
      <ul className="space-y-2 text-sm">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="capitalize text-oasis-900/75">{s.label}</span>
            <span className="font-semibold">{s.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AccountingTable({ rows, caption }: { rows: DailyAccountingRow[]; caption: string }) {
  const totals = {
    bookings: sum(rows, "bookings"),
    guests: sum(rows, "guests"),
    expected: sum(rows, "expectedRevenue"),
    collected: sum(rows, "collected"),
  };
  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-oasis-200/60">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-sand-200 text-xs uppercase tracking-wider text-oasis-900/50">
            <th className="px-5 py-3.5">{caption}</th>
            <th className="px-5 py-3.5">Bookings</th>
            <th className="px-5 py-3.5">Guests</th>
            <th className="px-5 py-3.5">Approved revenue</th>
            <th className="px-5 py-3.5">Collected</th>
            <th className="px-5 py-3.5">Outstanding</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.date} className="border-b border-sand-100 last:border-0">
              <td className="px-5 py-2.5">{formatDateShort(r.date)}</td>
              <td className="px-5 py-2.5">{r.bookings}</td>
              <td className="px-5 py-2.5">{r.guests}</td>
              <td className="px-5 py-2.5">{r.expectedRevenue} JOD</td>
              <td className="px-5 py-2.5">{r.collected} JOD</td>
              <td className="px-5 py-2.5">{Math.max(0, r.expectedRevenue - r.collected)} JOD</td>
            </tr>
          ))}
          <tr className="bg-sand-100/60 font-semibold">
            <td className="px-5 py-3">Total</td>
            <td className="px-5 py-3">{totals.bookings}</td>
            <td className="px-5 py-3">{totals.guests}</td>
            <td className="px-5 py-3">{totals.expected} JOD</td>
            <td className="px-5 py-3">{totals.collected} JOD</td>
            <td className="px-5 py-3">{Math.max(0, totals.expected - totals.collected)} JOD</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function csvRows(rows: DailyAccountingRow[]): (string | number)[][] {
  return rows.map((r) => [
    r.date,
    r.bookings,
    r.guests,
    r.expectedRevenue,
    r.collected,
    Math.max(0, r.expectedRevenue - r.collected),
  ]);
}

const CSV_HEADER = [
  "Date",
  "Bookings",
  "Guests",
  "Approved revenue (JOD)",
  "Collected (JOD)",
  "Outstanding (JOD)",
];

export default async function InsightsPage() {
  const role = await getAdminRole();
  if (!role) redirect("/admin/login");
  if (role !== "manager") redirect("/admin");

  const { past, upcoming, statusCounts, heardAbout } = getInsights();
  const todayStr = today();

  const kpis = [
    { label: "Collected · last 30 days", value: `${sum(past, "collected")} JOD` },
    { label: "Approved revenue · last 30 days", value: `${sum(past, "expectedRevenue")} JOD` },
    { label: "Guests · last 30 days", value: sum(past, "guests") },
    { label: "Approved revenue · next 15 days", value: `${sum(upcoming, "expectedRevenue")} JOD` },
  ];

  const heardMax = Math.max(1, ...heardAbout.map((h) => h.count));

  return (
    <div className="min-h-screen bg-sand-50 pb-20">
      <header className="border-b border-sand-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-display text-xl font-semibold">
              Oasis
            </Link>
            <span className="rounded-full bg-sand-200 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sand-800">
              Insights
            </span>
          </div>
          <Link href="/admin" className="text-sm font-medium text-oasis-800 hover:text-oasis-600">
            ← Back to dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pt-8">
        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-oasis-200/60">
              <p className="text-sm text-oasis-900/50">{k.label}</p>
              <p className="mt-1 font-display text-3xl font-semibold">{k.value}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-oasis-200/60 lg:col-span-2">
            <h2 className="font-display text-xl font-semibold">Guests per day — last 30 days</h2>
            <p className="mb-4 text-xs text-oasis-900/45">Pending + approved guests by visit day.</p>
            <BarChart rows={past} value={(r) => r.guests} color="#33999c" />
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-oasis-200/60 lg:col-span-2">
            <h2 className="font-display text-xl font-semibold">Revenue per day — last 30 days</h2>
            <p className="mb-4 text-xs text-oasis-900/45">
              <span className="mr-4 inline-flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-oasis-800" /> Approved bookings
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-sand-500" /> Collected at the gate
              </span>
            </p>
            <RevenueChart rows={past} />
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-oasis-200/60">
            <h2 className="font-display text-xl font-semibold">Booking statuses</h2>
            <p className="mb-4 text-xs text-oasis-900/45">All bookings, all time.</p>
            <Donut
              segments={["approved", "pending", "rejected"].map((s) => ({
                label: s,
                count: statusCounts.find((c) => c.status === s)?.count ?? 0,
                color: STATUS_COLORS[s],
              }))}
            />
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-oasis-200/60">
            <h2 className="font-display text-xl font-semibold">Where guests hear about you</h2>
            <p className="mb-4 text-xs text-oasis-900/45">From the booking form.</p>
            {heardAbout.length === 0 ? (
              <p className="text-sm text-oasis-900/40">No answers yet.</p>
            ) : (
              <ul className="space-y-3">
                {heardAbout.map((h) => (
                  <li key={h.source}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-oasis-900/75">{h.source}</span>
                      <span className="font-semibold">{h.count}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-sand-100">
                      <div
                        className="h-2.5 rounded-full bg-oasis-500"
                        style={{ width: `${(h.count / heardMax) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Accounting */}
        <section className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-semibold">Accounting — last 30 days</h2>
            <CsvButton
              label="Download CSV"
              filename={`oasis-accounting-past-30-days-${todayStr}.csv`}
              header={CSV_HEADER}
              rows={csvRows(past)}
            />
          </div>
          <div className="mt-4">
            <AccountingTable rows={[...past].reverse()} caption="Day" />
          </div>
        </section>

        <section className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-semibold">Upcoming — next 15 days</h2>
            <CsvButton
              label="Download CSV"
              filename={`oasis-accounting-upcoming-${todayStr}.csv`}
              header={CSV_HEADER}
              rows={csvRows(upcoming)}
            />
          </div>
          <div className="mt-4">
            <AccountingTable rows={upcoming} caption="Day" />
          </div>
        </section>
      </main>
    </div>
  );
}
