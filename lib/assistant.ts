// The dashboard support assistant. It answers plain-language questions
// about bookings, guests, money, check-ins, capacity and customers by
// querying the local SQLite database directly — no AI service, no API
// key, nothing leaves the server. It understands a fixed (but broad) set
// of question shapes plus date words like "yesterday" or "last week".

import { getDb } from "./db";
import {
  getDailyCapacity,
  listBookings,
  sweepNoResponse,
  RELEASING_GUEST_STATUSES as RELEASING,
} from "./bookings";
import {
  addDays,
  dayOfWeek,
  formatDateLong,
  formatDateShort,
  isValidDateString,
  isWeekend,
  priceForDate,
  today,
} from "./dates";
import {
  PAYMENT_ACCOUNTS,
  WEEKDAY_PRICE,
  WEEKEND_PRICE,
} from "./config";
import type { AdminRole } from "./auth";

interface DateRange {
  start: string;
  end: string;
  label: string;
  /** True when the range came from words in the question (not a default). */
  explicit: boolean;
}

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];
const DAY_NAMES = [
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
];

function monthRange(year: number, month: number): { start: string; end: string } {
  const mm = String(month + 1).padStart(2, "0");
  const start = `${year}-${mm}-01`;
  const nextFirst =
    month === 11 ? `${year + 1}-01-01` : `${year}-${String(month + 2).padStart(2, "0")}-01`;
  return { start, end: addDays(nextFirst, -1) };
}

function rangeLabel(start: string, end: string, name?: string): string {
  if (start === end) return formatDateLong(start);
  const span = `${formatDateShort(start)} – ${formatDateShort(end)}`;
  return name ? `${name} (${span})` : span;
}

/** Find a date or date range mentioned in the question. */
export function parseDateRange(text: string, todayStr: string): DateRange | null {
  const t = todayStr;
  const day = (d: string, label: string): DateRange => ({
    start: d, end: d, label: `${label} (${formatDateLong(d)})`, explicit: true,
  });

  if (/\bday before yesterday\b/.test(text)) return day(addDays(t, -2), "The day before yesterday");
  if (/\byesterday\b/.test(text)) return day(addDays(t, -1), "Yesterday");
  if (/\btomorrow\b/.test(text)) return day(addDays(t, 1), "Tomorrow");
  if (/\b(today|tonight|so far today)\b/.test(text)) return day(t, "Today");

  const weekStart = addDays(t, -dayOfWeek(t)); // week runs Sunday–Saturday
  if (/\bthis week\b/.test(text)) {
    const end = addDays(weekStart, 6);
    return { start: weekStart, end, label: rangeLabel(weekStart, end, "This week"), explicit: true };
  }
  if (/\b(last|past) week\b/.test(text)) {
    const start = addDays(weekStart, -7);
    const end = addDays(weekStart, -1);
    return { start, end, label: rangeLabel(start, end, "Last week"), explicit: true };
  }
  if (/\bnext week\b/.test(text)) {
    const start = addDays(weekStart, 7);
    const end = addDays(weekStart, 13);
    return { start, end, label: rangeLabel(start, end, "Next week"), explicit: true };
  }
  if (/\bthis month\b/.test(text)) {
    const r = monthRange(Number(t.slice(0, 4)), Number(t.slice(5, 7)) - 1);
    return { ...r, label: rangeLabel(r.start, r.end, "This month"), explicit: true };
  }
  if (/\b(last|past) month\b/.test(text)) {
    const y = Number(t.slice(0, 4));
    const m = Number(t.slice(5, 7)) - 1;
    const r = m === 0 ? monthRange(y - 1, 11) : monthRange(y, m - 1);
    return { ...r, label: rangeLabel(r.start, r.end, "Last month"), explicit: true };
  }
  if (/\bnext month\b/.test(text)) {
    const y = Number(t.slice(0, 4));
    const m = Number(t.slice(5, 7)) - 1;
    const r = m === 11 ? monthRange(y + 1, 0) : monthRange(y, m + 1);
    return { ...r, label: rangeLabel(r.start, r.end, "Next month"), explicit: true };
  }
  if (/\bthis year\b/.test(text)) {
    const y = t.slice(0, 4);
    return { start: `${y}-01-01`, end: `${y}-12-31`, label: `This year (${y})`, explicit: true };
  }
  const lastN = text.match(/\b(?:last|past) (\d{1,3}) days\b/);
  if (lastN) {
    const n = Math.min(365, Math.max(1, Number(lastN[1])));
    const start = addDays(t, -(n - 1));
    return { start, end: t, label: rangeLabel(start, t, `Last ${n} days`), explicit: true };
  }

  const iso = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso && isValidDateString(iso[1])) return day(iso[1], "That day");

  // "5 august", "august 5", "aug 5th" — month name plus a day number.
  for (let m = 0; m < 12; m++) {
    const name = MONTH_NAMES[m];
    const short = name.slice(0, 3);
    const re = new RegExp(
      `\\b(?:(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${name}|${short})|(${name}|${short})\\s+(\\d{1,2})(?:st|nd|rd|th)?)\\b`
    );
    const match = text.match(re);
    if (match) {
      const dayNum = Number(match[1] ?? match[4]);
      const year = Number(t.slice(0, 4));
      const candidate = `${year}-${String(m + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      if (isValidDateString(candidate)) return day(candidate, "That day");
    }
    if (new RegExp(`\\b(${name})\\b`).test(text)) {
      const r = monthRange(Number(t.slice(0, 4)), m);
      const label = name[0].toUpperCase() + name.slice(1);
      return { ...r, label: `${label} (${rangeLabel(r.start, r.end)})`, explicit: true };
    }
  }

  // "15/8" or "15-8-2026" — day/month(/year), the local convention.
  const dm = text.match(/\b(\d{1,2})[/](\d{1,2})(?:[/](\d{2,4}))?\b/);
  if (dm) {
    const year = dm[3]
      ? dm[3].length === 2 ? 2000 + Number(dm[3]) : Number(dm[3])
      : Number(t.slice(0, 4));
    const candidate = `${year}-${dm[2].padStart(2, "0")}-${dm[1].padStart(2, "0")}`;
    if (isValidDateString(candidate)) return day(candidate, "That day");
  }

  // Weekday names: bare/"on friday" → the coming one (today counts);
  // "last friday" → the most recent one before today.
  for (let d = 0; d < 7; d++) {
    const name = DAY_NAMES[d];
    if (!new RegExp(`\\b${name}\\b`).test(text)) continue;
    const dow = dayOfWeek(t);
    if (new RegExp(`\\blast ${name}\\b`).test(text)) {
      const back = (dow - d + 7) % 7 || 7;
      return day(addDays(t, -back), `Last ${name[0].toUpperCase()}${name.slice(1)}`);
    }
    let ahead = (d - dow + 7) % 7;
    if (new RegExp(`\\bnext ${name}\\b`).test(text) && ahead === 0) ahead = 7;
    return day(addDays(t, ahead), ahead === 0 ? "Today" : `This ${name[0].toUpperCase()}${name.slice(1)}`);
  }

  return null;
}

interface RangeStats {
  bookings: number;
  pendingApproval: number;
  guests: number;
  expected: number;
  collected: number;
  pendingMoney: number;
  pendingMoneyBookings: number;
  checkedInGuests: number;
  checkedInBookings: number;
  noShow: number;
  cancelled: number;
  cancelledNoResponse: number;
}

function rangeStats(start: string, end: string): RangeStats {
  return getDb()
    .prepare(
      `SELECT
         COALESCE(SUM(status != 'rejected'), 0) AS bookings,
         COALESCE(SUM(status = 'pending'), 0) AS pendingApproval,
         COALESCE(SUM(CASE WHEN status IN ('pending','approved')
             AND guest_status NOT IN ${RELEASING} THEN guests ELSE 0 END), 0) AS guests,
         COALESCE(SUM(CASE WHEN status = 'approved'
             AND guest_status NOT IN ${RELEASING} THEN total_price ELSE 0 END), 0) AS expected,
         COALESCE(SUM(paid_amount), 0) AS collected,
         COALESCE(SUM(CASE WHEN status != 'rejected' AND guest_status NOT IN ${RELEASING}
             AND rate_type != 'complimentary'
             THEN MAX(total_price - COALESCE(paid_amount, 0), 0) ELSE 0 END), 0) AS pendingMoney,
         COALESCE(SUM(status != 'rejected' AND guest_status NOT IN ${RELEASING}
             AND rate_type != 'complimentary'
             AND total_price > COALESCE(paid_amount, 0)), 0) AS pendingMoneyBookings,
         COALESCE(SUM(checked_in_count), 0) AS checkedInGuests,
         COALESCE(SUM(guest_status = 'checked_in'), 0) AS checkedInBookings,
         COALESCE(SUM(guest_status = 'no_show'), 0) AS noShow,
         COALESCE(SUM(guest_status = 'cancelled'), 0) AS cancelled,
         COALESCE(SUM(guest_status = 'cancelled_no_response'), 0) AS cancelledNoResponse
       FROM bookings WHERE date >= ? AND date <= ?`
    )
    .get(start, end) as RangeStats;
}

function collectedByAccount(start: string, end: string): Record<string, number> {
  const rows = getDb()
    .prepare(
      `SELECT paid_account AS account, COALESCE(SUM(paid_amount), 0) AS total
       FROM bookings
       WHERE date >= ? AND date <= ? AND paid_amount IS NOT NULL AND paid_account IS NOT NULL
       GROUP BY paid_account`
    )
    .all(start, end) as { account: string; total: number }[];
  const out: Record<string, number> = Object.fromEntries(
    PAYMENT_ACCOUNTS.map((a) => [a, 0])
  );
  for (const r of rows) if (r.account in out) out[r.account] += r.total;
  return out;
}

function bookedOn(date: string): number {
  const row = getDb()
    .prepare(
      `SELECT COALESCE(SUM(guests), 0) AS total FROM bookings
       WHERE date = ? AND status IN ('pending', 'approved')
         AND guest_status NOT IN ${RELEASING}`
    )
    .get(date) as { total: number };
  return row.total;
}

const n = (count: number, one: string, many?: string) =>
  `${count} ${count === 1 ? one : (many ?? `${one}s`)}`;

function cancelLine(s: RangeStats): string {
  const total = s.cancelled + s.cancelledNoResponse;
  const noShow = s.noShow > 0 ? ` ${n(s.noShow, "no-show")}.` : "";
  if (total === 0) return `No cancellations.${noShow}`;
  const auto = s.cancelledNoResponse > 0 ? ` (${s.cancelledNoResponse} auto-cancelled after 24h with no response)` : "";
  return `${n(total, "cancellation")}${auto}.${noShow}`;
}

function summaryAnswer(r: DateRange): string {
  const s = rangeStats(r.start, r.end);
  if (s.bookings === 0 && s.collected === 0) {
    return `${r.label}: no bookings.`;
  }
  const lines = [
    `${r.label}:`,
    `• ${n(s.bookings, "booking")} for ${n(s.guests, "guest")}${s.pendingApproval > 0 ? ` — ${s.pendingApproval} still waiting for approval` : ""}`,
    `• ${n(s.checkedInGuests, "guest")} checked in`,
    `• Collected ${s.collected} JOD · ${s.pendingMoney} JOD still to collect`,
    `• ${cancelLine(s)}`,
  ];
  return lines.join("\n");
}

const MANAGER_ONLY =
  "That number lives on the manager's Insights page — you'll need a manager to look it up.";

const HELP = [
  "I answer from the Oasis booking system only — nothing online. Try asking things like:",
  "• How many bookings do we have today?",
  "• How much did we collect yesterday? / this week? / in July?",
  "• How many guests checked in on Friday?",
  "• How many spots are left tomorrow?",
  "• Any cancellations this month?",
  "• Find Rana / find 0790000000 (search by name or phone)",
  "• Summary of last week",
].join("\n");

/** Answer a plain-language question from the booking database. */
export function answerQuestion(raw: string, role: AdminRole): string {
  sweepNoResponse();
  const t = today();
  const text = ` ${raw
    .toLowerCase()
    .replace(/[?!.,;:'"()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()} `;

  if (text.trim().length === 0) return HELP;
  if (/\b(help|what can you|how do i use)\b/.test(text)) return HELP;
  if (
    text.trim().split(" ").length <= 3 &&
    /\b(hi|hello|hey|thanks|thank you|shukran|good morning|good evening)\b/.test(text)
  ) {
    return `Hello! Ask me anything about your bookings — numbers come straight from the system.\n\n${HELP}`;
  }

  const range = parseDateRange(text, t);
  const todayRange: DateRange = {
    start: t, end: t, label: `Today (${formatDateLong(t)})`, explicit: false,
  };
  const r = range ?? todayRange;

  // --- guest lookup: an explicit "find …" or a phone-like digit string ---
  const digits = text.replace(/[\s+-]/g, "").match(/\d{6,}/)?.[0];
  const findMatch = text.match(
    /\b(?:find|search(?: for)?|look ?up|who is|booking (?:for|of)|bookings (?:for|of))\s+(.+)/
  );
  if (digits || findMatch) {
    // Phones are stored as +962…, but people type 079…, 79… or 96279… —
    // try progressively looser digit variants until one matches.
    const queries = digits
      ? [...new Set([
          digits,
          digits.replace(/^0+/, ""),
          digits.replace(/^0+/, "").slice(-8),
        ])].filter((q) => q.length >= 5)
      : [findMatch![1].trim().replace(/\s+(today|yesterday|tomorrow)\b.*/, "").slice(0, 60)];
    let query = queries[0];
    let matches: ReturnType<typeof listBookings> = [];
    for (const q of queries) {
      matches = listBookings({ query: q, includePast: true });
      if (matches.length > 0) {
        query = q;
        break;
      }
    }
    matches = matches.slice(-6).reverse();
    if (matches.length === 0) return `No bookings found matching “${query}”.`;
    const lines = matches.map((b) => {
      const paid = b.paid_amount ?? 0;
      return `#${String(b.id).padStart(4, "0")} ${b.name} — ${formatDateShort(b.date)} · ${n(b.guests, "guest")} · ${b.status}${b.guest_status !== "open" ? ` / ${b.guest_status.replace(/_/g, " ")}` : ""} · paid ${paid}/${b.total_price} JOD · ${b.phone}`;
    });
    return `Found ${n(matches.length, "booking")} for “${query}”${matches.length === 6 ? " (showing the latest 6)" : ""}:\n${lines.join("\n")}`;
  }

  const asksMoney =
    /\b(collect|collected|revenue|income|money|earn|earned|made|sales|jod|paid|cash|cliq|visa)\b/.test(text);

  // --- entry price ---
  if (/\b(price|prices|cost|fee|fees|entrance|entry)\b/.test(text) && !asksMoney) {
    if (range && range.start === range.end) {
      const p = priceForDate(range.start);
      return `${formatDateLong(range.start)} is a ${isWeekend(range.start) ? "weekend" : "weekday"} day — entry is ${p} JOD per guest.`;
    }
    return `Entry is ${WEEKDAY_PRICE} JOD on weekdays (Sun–Thu) and ${WEEKEND_PRICE} JOD on weekends (Fri–Sat), per guest.`;
  }

  // --- capacity / spots left ---
  if (
    /\b(capacity|spots?|space|availab\w*|full(?:y booked)?|room left|how many left|remaining)\b/.test(text) &&
    !asksMoney
  ) {
    const cap = getDailyCapacity();
    if (r.start === r.end) {
      const booked = bookedOn(r.start);
      const free = Math.max(0, cap - booked);
      if (r.end < t) return `${r.label}: ${n(booked, "guest")} were booked (capacity was ${cap}).`;
      return free === 0
        ? `${r.label}: fully booked — ${booked}/${cap} guests.`
        : `${r.label}: ${free} of ${cap} spots are free (${booked} booked). Entry that day is ${priceForDate(r.start)} JOD.`;
    }
    const lines: string[] = [];
    let d = r.start;
    for (let i = 0; i < 14 && d <= r.end; i++, d = addDays(d, 1)) {
      const booked = bookedOn(d);
      lines.push(`• ${formatDateShort(d)}: ${Math.max(0, cap - booked)} free (${booked} booked)`);
    }
    if (d <= r.end) lines.push("… (first 14 days shown)");
    return `${r.label} — daily capacity ${cap}:\n${lines.join("\n")}`;
  }

  // --- pending: approval queue vs money owed ---
  if (/\bpending|waiting|awaiting|approv\w*\b/.test(text) && /\b(booking|request|approval|approve)\w*\b/.test(text)) {
    const scope = range ?? { start: t, end: addDays(t, 365), label: "Upcoming", explicit: false };
    const s = rangeStats(scope.start, scope.end);
    if (s.pendingApproval === 0) return `${scope.label}: nothing waiting for approval. All caught up ✓`;
    const soonest = getDb()
      .prepare(
        "SELECT id, name, date FROM bookings WHERE status = 'pending' AND date >= ? AND date <= ? ORDER BY date ASC LIMIT 1"
      )
      .get(scope.start, scope.end) as { id: number; name: string; date: string } | undefined;
    return `${scope.label}: ${n(s.pendingApproval, "booking request")} waiting for approval${
      soonest ? ` — the soonest is #${String(soonest.id).padStart(4, "0")} (${soonest.name}) on ${formatDateShort(soonest.date)}` : ""
    }.`;
  }
  if (/\b(pending|unpaid|outstanding|owed?|owes|still to collect)\b/.test(text)) {
    const s = rangeStats(r.start, r.end);
    return `${r.label}: ${s.pendingMoney} JOD still to collect across ${n(s.pendingMoneyBookings, "booking")} (collected so far: ${s.collected} JOD).`;
  }

  // --- money collected ---
  if (asksMoney) {
    const s = rangeStats(r.start, r.end);
    const by = collectedByAccount(r.start, r.end);
    const account = PAYMENT_ACCOUNTS.find((a) => text.includes(` ${a.toLowerCase()} `));
    if (account) {
      return `${r.label}: ${by[account]} JOD collected via ${account} (total collected: ${s.collected} JOD).`;
    }
    const split = PAYMENT_ACCOUNTS.map((a) => `${a} ${by[a]}`).join(" · ");
    return `${r.label}: collected ${s.collected} JOD (${split}). ${s.pendingMoney} JOD still to collect from approved bookings.`;
  }

  // --- check-ins / arrivals ---
  if (/\b(check(?:ed)?[- ]?in|checkin|arriv\w*|attend\w*|showed|show up|turned up|came|walk[- ]?ins?)\b/.test(text)) {
    const s = rangeStats(r.start, r.end);
    if (s.bookings === 0) return `${r.label}: no bookings.`;
    const still = Math.max(0, s.guests - s.checkedInGuests);
    const suffix =
      r.end >= t && r.start <= t && still > 0 ? ` ${still} still expected.` : "";
    return `${r.label}: ${n(s.checkedInGuests, "guest")} checked in (across ${n(s.checkedInBookings, "booking")}), out of ${s.guests} booked.${suffix}`;
  }

  // --- cancellations / no-shows ---
  if (/\b(cancel\w*|no[- ]?response|no[- ]?shows?)\b/.test(text)) {
    const s = rangeStats(r.start, r.end);
    const total = s.cancelled + s.cancelledNoResponse;
    const noShow = s.noShow > 0 ? ` ${n(s.noShow, "guest")} marked no-show (booked but never arrived).` : "";
    if (total === 0) return `${r.label}: no cancellations.${noShow}`;
    const kept = s.bookings - total - s.noShow;
    return `${r.label}: ${n(total, "cancellation")} — ${s.cancelled} cancelled directly, ${s.cancelledNoResponse} auto-cancelled after 24h with no response.${noShow} Active bookings kept: ${kept >= 0 ? kept : 0}.`;
  }

  // --- manager-only analytics ---
  if (/\b(hear|heard|sources?|instagram|tiktok|facebook|marketing)\b/.test(text)) {
    if (role !== "manager") return MANAGER_ONLY;
    const rows = getDb()
      .prepare(
        "SELECT heard_about FROM bookings WHERE heard_about IS NOT NULL AND heard_about != ''"
      )
      .all() as { heard_about: string }[];
    const counts = new Map<string, number>();
    for (const row of rows)
      for (const token of row.heard_about.split(", "))
        counts.set(token, (counts.get(token) ?? 0) + 1);
    if (counts.size === 0) return "No guests have told us where they heard about Oasis yet.";
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    return `Where guests heard about us (all time):\n${top.map(([s2, c]) => `• ${s2}: ${c}`).join("\n")}`;
  }
  if (/\b(views?|visits?|visitors|clicks?|website traffic)\b/.test(text)) {
    if (role !== "manager") return MANAGER_ONLY;
    const views = getDb()
      .prepare(
        "SELECT COUNT(*) AS n FROM events WHERE type = 'page_view' AND created_at >= datetime('now', '-30 days')"
      )
      .get() as { n: number };
    const clicks = getDb()
      .prepare(
        `SELECT COALESCE(meta, 'unknown') AS source, COUNT(*) AS count FROM events
         WHERE type = 'book_click' AND created_at >= datetime('now', '-30 days')
         GROUP BY source ORDER BY count DESC LIMIT 5`
      )
      .all() as { source: string; count: number }[];
    const clickText = clicks.length
      ? `Top “Book” clicks: ${clicks.map((c) => `${c.source} (${c.count})`).join(", ")}.`
      : "No “Book” clicks recorded yet.";
    return `Website, last 30 days: ${views.n} page views. ${clickText}`;
  }
  if (/\b(returning|repeat|unique|loyal)\b/.test(text)) {
    if (role !== "manager") return MANAGER_ONLY;
    const rep = getDb()
      .prepare(
        `SELECT COUNT(*) AS totalGuests,
                COALESCE(SUM(CASE WHEN cnt > 1 THEN 1 ELSE 0 END), 0) AS repeatGuests
         FROM (SELECT phone, COUNT(*) AS cnt FROM bookings WHERE status != 'rejected' GROUP BY phone)`
      )
      .get() as { totalGuests: number; repeatGuests: number };
    const rate = rep.totalGuests > 0 ? Math.round((rep.repeatGuests / rep.totalGuests) * 100) : 0;
    return `${n(rep.totalGuests, "unique customer")} so far — ${rep.repeatGuests} booked more than once (${rate}% returning).`;
  }

  // --- busiest day ---
  if (/\b(busiest|peak|best day|most bookings|most guests)\b/.test(text)) {
    const scope = range ?? (() => {
      const mr = monthRange(Number(t.slice(0, 4)), Number(t.slice(5, 7)) - 1);
      return { ...mr, label: "This month", explicit: false };
    })();
    const rows = getDb()
      .prepare(
        `SELECT date, COALESCE(SUM(guests), 0) AS g FROM bookings
         WHERE date >= ? AND date <= ? AND status IN ('pending','approved')
           AND guest_status NOT IN ${RELEASING}
         GROUP BY date ORDER BY g DESC LIMIT 3`
      )
      .all(scope.start, scope.end) as { date: string; g: number }[];
    if (rows.length === 0 || rows[0].g === 0) return `${scope.label}: no bookings yet.`;
    const [first, ...rest] = rows;
    const restText = rest.filter((x) => x.g > 0).map((x) => `${formatDateShort(x.date)} (${x.g})`).join(", ");
    return `${scope.label}: busiest day is ${formatDateLong(first.date)} with ${n(first.g, "guest")} booked${restText ? `, followed by ${restText}` : ""}.`;
  }

  // --- guests booked ---
  if (/\b(guests?|people|ladies|visitors|swimmers)\b/.test(text)) {
    const s = rangeStats(r.start, r.end);
    if (s.bookings === 0) return `${r.label}: no bookings.`;
    return `${r.label}: ${n(s.guests, "guest")} booked across ${n(s.bookings, "booking")}. ${s.checkedInGuests} checked in so far.`;
  }

  // --- bookings count ---
  if (/\b(bookings?|reservations?|reserved|booked)\b/.test(text)) {
    if (!range) {
      const todayStats = rangeStats(t, t);
      const up = rangeStats(addDays(t, 1), addDays(t, 365));
      return `Today: ${n(todayStats.bookings, "booking")} for ${n(todayStats.guests, "guest")}${todayStats.pendingApproval > 0 ? ` (${todayStats.pendingApproval} awaiting approval)` : ""}. Upcoming after today: ${n(up.bookings, "booking")} for ${n(up.guests, "guest")}. Ask about a day or week for details.`;
    }
    return summaryAnswer(r);
  }

  // --- fallback: a date alone gets a summary; otherwise show help ---
  if (range) return summaryAnswer(range);
  return `I didn't catch that one — I only know your booking system's data.\n\n${HELP}`;
}
