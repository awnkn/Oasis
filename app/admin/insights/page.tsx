import Link from "next/link";
import { redirect } from "next/navigation";
import CsvButton from "@/components/CsvButton";
import { getAdminRole } from "@/lib/auth";
import {
  getInsights,
  guestJourney,
  recentActivity,
  sweepNoResponse,
  type DailyAccountingRow,
  type JourneyRow,
} from "@/lib/bookings";
import { formatDateShort, today } from "@/lib/dates";
import {
  GUEST_STATUSES,
  GUEST_STATUS_LABELS,
  PAYMENT_ACCOUNTS,
} from "@/lib/config";

/** SQLite UTC timestamp → Amman-local display. */
function formatWhen(utc: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Amman",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(utc.replace(" ", "T") + "Z"));
}

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
            <span className="capitalize text-zinc-700">{s.label}</span>
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
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200/70 text-xs uppercase tracking-wider text-zinc-500">
            <th className="px-5 py-3.5">{caption}</th>
            <th className="px-5 py-3.5">Bookings</th>
            <th className="px-5 py-3.5">Guests</th>
            <th className="px-5 py-3.5">Approved revenue</th>
            <th className="px-5 py-3.5">Collected</th>
            {PAYMENT_ACCOUNTS.map((a) => (
              <th key={a} className="px-5 py-3.5">
                {a}
              </th>
            ))}
            <th className="px-5 py-3.5">Outstanding</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.date} className="border-b border-zinc-100 last:border-0">
              <td className="px-5 py-2.5">{formatDateShort(r.date)}</td>
              <td className="px-5 py-2.5">{r.bookings}</td>
              <td className="px-5 py-2.5">{r.guests}</td>
              <td className="px-5 py-2.5">{r.expectedRevenue} JOD</td>
              <td className="px-5 py-2.5 font-medium">{r.collected} JOD</td>
              {PAYMENT_ACCOUNTS.map((a) => (
                <td key={a} className="px-5 py-2.5 text-zinc-500">
                  {r.byAccount[a] ?? 0}
                </td>
              ))}
              <td className="px-5 py-2.5">{Math.max(0, r.expectedRevenue - r.collected)} JOD</td>
            </tr>
          ))}
          <tr className="bg-zinc-50 font-semibold">
            <td className="px-5 py-3">Total</td>
            <td className="px-5 py-3">{totals.bookings}</td>
            <td className="px-5 py-3">{totals.guests}</td>
            <td className="px-5 py-3">{totals.expected} JOD</td>
            <td className="px-5 py-3">{totals.collected} JOD</td>
            {PAYMENT_ACCOUNTS.map((a) => (
              <td key={a} className="px-5 py-3">
                {rows.reduce((acc, r) => acc + (r.byAccount[a] ?? 0), 0)}
              </td>
            ))}
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
    ...PAYMENT_ACCOUNTS.map((a) => r.byAccount[a] ?? 0),
    Math.max(0, r.expectedRevenue - r.collected),
  ]);
}

const CSV_HEADER = [
  "Date",
  "Bookings",
  "Guests",
  "Approved revenue (JOD)",
  "Collected (JOD)",
  ...PAYMENT_ACCOUNTS.map((a) => `${a} (JOD)`),
  "Outstanding (JOD)",
];

export default async function InsightsPage() {
  const role = await getAdminRole();
  if (!role) redirect("/admin/login");
  if (role !== "manager") redirect("/admin");

  sweepNoResponse();
  const { past, upcoming, statusCounts, heardAbout, returning, views30, bookClicks } =
    getInsights();
  const clickMax = Math.max(1, ...bookClicks.map((c) => c.count));
  const activity = recentActivity(60);
  const journeys: { title: string; unit: string; rows: JourneyRow[] }[] = [
    { title: "Daily — last 14 days", unit: "day", rows: guestJourney("day", 14) },
    { title: "Weekly — last 8 weeks", unit: "week", rows: guestJourney("week", 8) },
    { title: "Monthly — last 6 months", unit: "month", rows: guestJourney("month", 6) },
  ];
  const todayStr = today();

  const accountTotals = PAYMENT_ACCOUNTS.map((a) => ({
    account: a,
    total: past.reduce((acc, r) => acc + (r.byAccount[a] ?? 0), 0),
  }));
  const accountMax = Math.max(1, ...accountTotals.map((a) => a.total));

  const todayRow = past[past.length - 1];
  const kpis: { label: string; value: string | number; sub?: string }[] = [
    { label: "Total collected today", value: `${todayRow?.collected ?? 0} JOD` },
    {
      label: "Total bookings today",
      value: todayRow?.bookings ?? 0,
      sub: "excluding rejected",
    },
    { label: "Collected · last 30 days", value: `${sum(past, "collected")} JOD` },
    { label: "Approved revenue · last 30 days", value: `${sum(past, "expectedRevenue")} JOD` },
    { label: "Guests · last 30 days", value: sum(past, "guests") },
    { label: "Approved revenue · next 15 days", value: `${sum(upcoming, "expectedRevenue")} JOD` },
    {
      label: "Website views · last 30 days",
      value: views30,
      sub: "public pages only, dashboard excluded",
    },
    {
      label: "Unique customers · all time",
      value: returning.totalGuests,
      sub: "distinct guests by phone number",
    },
    {
      label: "Returning customers",
      value: `${returning.rate}%`,
      sub: `${returning.repeatGuests} of ${returning.totalGuests} booked more than once`,
    },
  ];

  const heardMax = Math.max(1, ...heardAbout.map((h) => h.count));

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      <header className="border-b border-zinc-200/70 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo-black.png"
                alt="Oasis by Azara"
                className="h-7 w-auto"
              />
            </Link>
            <span className="rounded-full bg-sand-200 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sand-800">
              Insights
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/api/admin/backup"
              className="rounded-full border border-oasis-950/10 px-4 py-2 text-sm font-medium text-oasis-800 transition hover:bg-oasis-50"
            >
              Download backup
            </a>
            <Link href="/admin" className="text-sm font-medium text-oasis-800 hover:text-oasis-600">
              ← Back to dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pt-8">
        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
              <p className="text-sm text-zinc-500">{k.label}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">{k.value}</p>
              {k.sub && <p className="mt-1 text-xs text-zinc-400">{k.sub}</p>}
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 lg:col-span-2">
            <h2 className="text-base font-semibold tracking-tight">Guests per day — last 30 days</h2>
            <p className="mb-4 text-xs text-zinc-400">Pending + approved guests by visit day.</p>
            <BarChart rows={past} value={(r) => r.guests} color="#33999c" />
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 lg:col-span-2">
            <h2 className="text-base font-semibold tracking-tight">Revenue per day — last 30 days</h2>
            <p className="mb-4 text-xs text-zinc-400">
              <span className="mr-4 inline-flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-oasis-800" /> Approved bookings
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-sand-500" /> Collected at the gate
              </span>
            </p>
            <RevenueChart rows={past} />
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <h2 className="text-base font-semibold tracking-tight">Booking statuses</h2>
            <p className="mb-4 text-xs text-zinc-400">All bookings, all time.</p>
            <Donut
              segments={["approved", "pending", "rejected"].map((s) => ({
                label: s,
                count: statusCounts.find((c) => c.status === s)?.count ?? 0,
                color: STATUS_COLORS[s],
              }))}
            />
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <h2 className="text-base font-semibold tracking-tight">
              Where guests press “Book”
            </h2>
            <p className="mb-4 text-xs text-zinc-400">
              Clicks by page section, last 30 days.
            </p>
            {bookClicks.length === 0 ? (
              <p className="text-sm text-zinc-400">No clicks recorded yet.</p>
            ) : (
              <ul className="space-y-3">
                {bookClicks.map((c) => (
                  <li key={c.source}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="capitalize text-zinc-700">
                        {c.source.replace(/-/g, " ")}
                      </span>
                      <span className="font-semibold">{c.count}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-zinc-100">
                      <div
                        className="h-2.5 rounded-full bg-oasis-500"
                        style={{ width: `${(c.count / clickMax) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <h2 className="text-base font-semibold tracking-tight">Collected by account</h2>
            <p className="mb-4 text-xs text-zinc-400">Last 30 days, from recorded payments.</p>
            <ul className="space-y-3">
              {accountTotals.map((a) => (
                <li key={a.account}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-zinc-700">{a.account}</span>
                    <span className="font-semibold">{a.total} JOD</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-sand-100">
                    <div
                      className="h-2.5 rounded-full bg-sand-500"
                      style={{ width: `${(a.total / accountMax) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <h2 className="text-base font-semibold tracking-tight">Where guests hear about you</h2>
            <p className="mb-4 text-xs text-zinc-400">From the booking form.</p>
            {heardAbout.length === 0 ? (
              <p className="text-sm text-zinc-400">No answers yet.</p>
            ) : (
              <ul className="space-y-3">
                {heardAbout.map((h) => (
                  <li key={h.source}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-zinc-700">{h.source}</span>
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
            <h2 className="text-lg font-semibold tracking-tight">Accounting — last 30 days</h2>
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
            <h2 className="text-lg font-semibold tracking-tight">Upcoming — next 15 days</h2>
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

        {/* Guest journey — partner reports */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight">Guest journey</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Bookings by visit date, broken down by guest status — how many were
            contacted, confirmed, checked in, cancelled or auto-cancelled.
          </p>
          {journeys.map(({ title, unit, rows }) => (
            <div key={unit} className="mt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
                <CsvButton
                  label="Download CSV"
                  filename={`oasis-guest-journey-${unit}-${todayStr}.csv`}
                  header={[
                    unit === "day" ? "Date" : unit === "week" ? "Week" : "Month",
                    "Total bookings",
                    ...GUEST_STATUSES.map((s) => GUEST_STATUS_LABELS[s]),
                    "Checked-in guests",
                    "Rejected (booking)",
                  ]}
                  rows={rows.map((r) => [
                    r.period,
                    r.total,
                    ...GUEST_STATUSES.map((s) => r.counts[s]),
                    r.checkedInGuests,
                    r.rejected,
                  ])}
                />
              </div>
              <div className="mt-3 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-oasis-950/5">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200/70 text-xs uppercase tracking-wider text-zinc-500">
                      <th className="px-4 py-3">
                        {unit === "day" ? "Date" : unit === "week" ? "Week" : "Month"}
                      </th>
                      <th className="px-4 py-3">Total</th>
                      {GUEST_STATUSES.map((s) => (
                        <th key={s} className="px-4 py-3">
                          {GUEST_STATUS_LABELS[s]}
                        </th>
                      ))}
                      <th className="px-4 py-3">Guests in</th>
                      <th className="px-4 py-3">Rejected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 && (
                      <tr>
                        <td
                          colSpan={GUEST_STATUSES.length + 4}
                          className="px-4 py-8 text-center text-zinc-400"
                        >
                          No bookings in this period.
                        </td>
                      </tr>
                    )}
                    {rows.map((r) => (
                      <tr key={r.period} className="border-b border-zinc-100 last:border-0">
                        <td className="px-4 py-2.5 font-medium">
                          {unit === "day" ? formatDateShort(r.period) : r.period}
                        </td>
                        <td className="px-4 py-2.5">{r.total}</td>
                        {GUEST_STATUSES.map((s) => (
                          <td
                            key={s}
                            className={`px-4 py-2.5 ${r.counts[s] === 0 ? "text-zinc-300" : ""}`}
                          >
                            {r.counts[s]}
                          </td>
                        ))}
                        <td className="px-4 py-2.5 font-medium text-oasis-600">
                          {r.checkedInGuests}
                        </td>
                        <td className={`px-4 py-2.5 ${r.rejected === 0 ? "text-zinc-300" : ""}`}>
                          {r.rejected}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>

        {/* Activity log */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight">Activity log</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Every sign-in, status change, payment, check-in and capacity change
            — permanent and uneditable.
          </p>
          <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200/70 text-xs uppercase tracking-wider text-zinc-500">
                  <th className="px-5 py-3.5">When</th>
                  <th className="px-5 py-3.5">Who</th>
                  <th className="px-5 py-3.5">Action</th>
                  <th className="px-5 py-3.5">Details</th>
                </tr>
              </thead>
              <tbody>
                {activity.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-zinc-400">
                      No activity recorded yet.
                    </td>
                  </tr>
                )}
                {activity.map((entry) => (
                  <tr key={entry.id} className="border-b border-zinc-100 last:border-0">
                    <td className="whitespace-nowrap px-5 py-2.5 text-zinc-500">
                      {formatWhen(entry.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-2.5">
                      <span className="font-medium">{entry.actor_name}</span>
                      <span
                        className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                          entry.actor_role === "manager"
                            ? "bg-oasis-100 text-oasis-700"
                            : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {entry.actor_role}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-2.5 capitalize text-zinc-500">
                      {entry.action.replace("_", "-")}
                    </td>
                    <td className="px-5 py-2.5">{entry.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
