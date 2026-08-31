import { CLUB_NAME, NIGHT_SWIM_TIME } from "./config";
import { formatDateLong, whenLabel } from "./dates";
import { getBooking, logAction, type Booking } from "./bookings";
import { SITE_URL } from "./seo";

/** A "Night swim · 6:30 – 10:30 PM" table row for confirmation/reminder
 *  emails — only shown for night bookings. Empty string for day swims. */
function nightRow(b: Booking): string {
  if (b.session !== "night") return "";
  return `<tr>
    <td style="padding:12px 0;color:#8e8e93;border-top:1px solid #f2f2f2">Session</td>
    <td style="padding:12px 0;text-align:right;font-weight:600;border-top:1px solid #f2f2f2">🌙 Night swim · ${NIGHT_SWIM_TIME}</td>
  </tr>`;
}

// Automatic guest notifications, sent when a booking is approved.
// Each channel activates only when its environment variables are set —
// with nothing configured, approval works exactly as before.
//
//   Email    → RESEND_API_KEY + EMAIL_FROM              (resend.com)
//   WhatsApp → WHATSAPP_TOKEN + WHATSAPP_PHONE_ID       (Meta Cloud API)
//              optional WHATSAPP_TEMPLATE (default "booking_confirmed")
//              optional WHATSAPP_LANG     (default "en")

const SYSTEM = { name: "System", role: "system" };

async function sendEmail(b: Booking): Promise<string | null> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from || !b.email) return null;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${CLUB_NAME} <${from}>`,
      to: [b.email],
      subject: `Your booking is confirmed — ${formatDateLong(b.date)}`,
      html: `
        <div style="background:#fafafa;padding:32px 16px">
          <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #ececec;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1c1e">
            <img src="${SITE_URL}/images/email-header.jpg" alt="${CLUB_NAME}" width="560" style="width:100%;display:block" />
            <div style="padding:36px 40px 40px">
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:600;letter-spacing:-0.2px">Your booking at Oasis is confirmed!</h1>
              <p style="margin:14px 0 0;font-size:15px;line-height:1.6;color:#6b6b70">
                Dear ${escapeHtml(b.name.split(" ")[0])}, your day of stillness is set.
                Bring this reference and we'll take care of the rest.
              </p>
              <table style="width:100%;border-collapse:collapse;margin-top:28px;font-size:15px">
                <tr>
                  <td style="padding:12px 0;color:#8e8e93">Reference</td>
                  <td style="padding:12px 0;text-align:right;font-weight:600">#${String(b.id).padStart(4, "0")}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;color:#8e8e93;border-top:1px solid #f2f2f2">Day</td>
                  <td style="padding:12px 0;text-align:right;font-weight:600;border-top:1px solid #f2f2f2">${formatDateLong(b.date)}</td>
                </tr>
                ${nightRow(b)}
                <tr>
                  <td style="padding:12px 0;color:#8e8e93;border-top:1px solid #f2f2f2">Guests</td>
                  <td style="padding:12px 0;text-align:right;font-weight:600;border-top:1px solid #f2f2f2">${b.guests}</td>
                </tr>
                <tr>
                  <td style="padding:14px 0 0;color:#8e8e93;border-top:1px solid #f2f2f2">Total at the gate</td>
                  <td style="padding:14px 0 0;text-align:right;border-top:1px solid #f2f2f2;font-weight:700;font-size:18px;color:#297c80">${b.total_price} JOD</td>
                </tr>
              </table>
              <p style="margin:28px 0 0;font-size:13px;line-height:1.6;color:#8e8e93">
                Changes need at least 24 hours' notice. Mondays welcome ages 10+;
                all other days are 16+. Pool seating is first-come, first-served.
              </p>
              <p style="margin:24px 0 0;font-size:15px">
                See you at the oasis 🌴<br/>
                <span style="color:#6b6b70">${CLUB_NAME}</span>
              </p>
            </div>
          </div>
          <p style="max-width:560px;margin:16px auto 0;text-align:center;font-size:12px;color:#b0b0b5">
            ${CLUB_NAME} · Ladies only · Amman, Jordan
          </p>
        </div>`,
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return "email";
}

async function sendWhatsApp(b: Booking): Promise<string | null> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) return null;

  const template = process.env.WHATSAPP_TEMPLATE || "booking_confirmed";
  const lang = process.env.WHATSAPP_LANG || "en";
  const to = b.phone.replace(/\D/g, "");

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${phoneId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: template,
          language: { code: lang },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: b.name.split(" ")[0] },
                { type: "text", text: String(b.id).padStart(4, "0") },
                { type: "text", text: whenLabel(b.date, b.session) },
                { type: "text", text: `${b.guests} ${b.guests === 1 ? "guest" : "guests"}` },
                { type: "text", text: `${b.total_price} JOD` },
              ],
            },
          ],
        },
      }),
    }
  );
  if (!res.ok) {
    throw new Error(
      `WhatsApp ${res.status}: ${(await res.text()).slice(0, 200)}`
    );
  }
  return "WhatsApp";
}

/** Fire both channels; failures are logged, never thrown to the caller. */
export async function sendApprovalNotifications(bookingId: number): Promise<void> {
  const booking = getBooking(bookingId);
  if (!booking || booking.status !== "approved") return;

  const results = await Promise.allSettled([
    sendEmail(booking),
    sendWhatsApp(booking),
  ]);

  const sent: string[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) sent.push(r.value);
    if (r.status === "rejected") {
      logAction(
        SYSTEM,
        "notify_failed",
        `Booking #${bookingId}: ${String(r.reason).slice(0, 200)}`,
        bookingId
      );
    }
  }
  if (sent.length > 0) {
    logAction(
      SYSTEM,
      "notify",
      `Booking #${bookingId} (${booking.name}): confirmation sent via ${sent.join(" + ")}`,
      bookingId
    );
  }
}

// ---------- day-before reminders ----------

async function sendReminderEmail(b: Booking): Promise<string | null> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from || !b.email) return null;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${CLUB_NAME} <${from}>`,
      to: [b.email],
      subject: `See you tomorrow — ${formatDateLong(b.date)}`,
      html: `
        <div style="background:#fafafa;padding:32px 16px">
          <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #ececec;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1c1e">
            <img src="${SITE_URL}/images/email-header.jpg" alt="${CLUB_NAME}" width="560" style="width:100%;display:block" />
            <div style="padding:36px 40px 40px">
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:600;letter-spacing:-0.2px">See you tomorrow, ${escapeHtml(b.name.split(" ")[0])} 🌴</h1>
              <p style="margin:14px 0 0;font-size:15px;line-height:1.6;color:#6b6b70">
                A friendly reminder that your day at Oasis is tomorrow. Here are
                your details once more.
              </p>
              <table style="width:100%;border-collapse:collapse;margin-top:28px;font-size:15px">
                <tr>
                  <td style="padding:12px 0;color:#8e8e93">Reference</td>
                  <td style="padding:12px 0;text-align:right;font-weight:600">#${String(b.id).padStart(4, "0")}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;color:#8e8e93;border-top:1px solid #f2f2f2">Day</td>
                  <td style="padding:12px 0;text-align:right;font-weight:600;border-top:1px solid #f2f2f2">${formatDateLong(b.date)}</td>
                </tr>
                ${nightRow(b)}
                <tr>
                  <td style="padding:12px 0;color:#8e8e93;border-top:1px solid #f2f2f2">Guests</td>
                  <td style="padding:12px 0;text-align:right;font-weight:600;border-top:1px solid #f2f2f2">${b.guests}</td>
                </tr>
                <tr>
                  <td style="padding:14px 0 0;color:#8e8e93;border-top:1px solid #f2f2f2">Total at the gate</td>
                  <td style="padding:14px 0 0;text-align:right;border-top:1px solid #f2f2f2;font-weight:700;font-size:18px;color:#297c80">${b.total_price} JOD</td>
                </tr>
              </table>
              <p style="margin:28px 0 0;font-size:13px;line-height:1.6;color:#8e8e93">
                A few reminders: Oasis is 16+ (Mondays welcome ages 10+). No
                outside food or drinks, and photography is not permitted. Pay at
                the gate by cash or CliQ. Pool seating is first come, first served.
              </p>
              <p style="margin:24px 0 0;font-size:15px">
                We can't wait to welcome you 🌴<br/>
                <span style="color:#6b6b70">${CLUB_NAME}</span>
              </p>
            </div>
          </div>
          <p style="max-width:560px;margin:16px auto 0;text-align:center;font-size:12px;color:#b0b0b5">
            ${CLUB_NAME} · Ladies only · Amman, Jordan
          </p>
        </div>`,
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return "email";
}

async function sendWhatsAppReminder(b: Booking): Promise<string | null> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) return null;

  // A reminder is a separate, business-initiated message, so it needs its
  // own approved template (defaults to "booking_reminder"). Same five body
  // variables as the confirmation, in the same order.
  const template = process.env.WHATSAPP_REMINDER_TEMPLATE || "booking_reminder";
  const lang = process.env.WHATSAPP_LANG || "en";
  const to = b.phone.replace(/\D/g, "");

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${phoneId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: template,
          language: { code: lang },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: b.name.split(" ")[0] },
                { type: "text", text: String(b.id).padStart(4, "0") },
                { type: "text", text: whenLabel(b.date, b.session) },
                { type: "text", text: `${b.guests} ${b.guests === 1 ? "guest" : "guests"}` },
                { type: "text", text: `${b.total_price} JOD` },
              ],
            },
          ],
        },
      }),
    }
  );
  if (!res.ok) {
    throw new Error(`WhatsApp ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return "WhatsApp";
}

/** Outcome of a reminder attempt, so the caller can retry real failures. */
export type ReminderOutcome = "sent" | "nothing" | "failed";

/**
 * Fire the day-before reminder on both channels; failures are logged.
 * Returns "sent" when a channel delivered, "failed" when a configured
 * channel errored (so the caller can retry), or "nothing" when no channel
 * is set up (nothing to retry).
 */
export async function sendReminderNotifications(
  bookingId: number
): Promise<ReminderOutcome> {
  const booking = getBooking(bookingId);
  if (!booking) return "nothing";

  const results = await Promise.allSettled([
    sendReminderEmail(booking),
    sendWhatsAppReminder(booking),
  ]);

  const sent: string[] = [];
  let failed = false;
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) sent.push(r.value);
    if (r.status === "rejected") {
      failed = true;
      logAction(
        SYSTEM,
        "reminder_failed",
        `Booking #${bookingId}: ${String(r.reason).slice(0, 200)}`,
        bookingId
      );
    }
  }
  if (sent.length > 0) {
    logAction(
      SYSTEM,
      "reminder",
      `Booking #${bookingId} (${booking.name}): day-before reminder sent via ${sent.join(" + ")}`,
      bookingId
    );
    return "sent";
  }
  return failed ? "failed" : "nothing";
}

// ---------- event ticket confirmations ----------

interface EventTicketLike {
  id: number;
  name: string;
  email: string | null;
  quantity: number;
  total_price: number;
}
interface EventLike {
  title: string;
  event_date: string | null;
  start_time: string | null;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Confirmation email for an approved event reservation. */
export async function sendEventApprovalEmail(
  ticket: EventTicketLike,
  event: EventLike
): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from || !ticket.email) return;

  const first = escapeHtml(ticket.name.split(" ")[0]);
  const when = [
    event.event_date ? formatDateLong(event.event_date) : null,
    event.start_time,
  ]
    .filter(Boolean)
    .join(" · ");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `${CLUB_NAME} <${from}>`,
        to: [ticket.email],
        subject: `You're confirmed — ${event.title}`,
        html: `
          <div style="background:#fafafa;padding:32px 16px">
            <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #ececec;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1c1e">
              <img src="${SITE_URL}/images/email-header.jpg" alt="${CLUB_NAME}" width="560" style="width:100%;display:block" />
              <div style="padding:36px 40px 40px">
                <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:600">Your spot is confirmed 🎉</h1>
                <p style="margin:14px 0 0;font-size:15px;line-height:1.6;color:#6b6b70">
                  Dear ${first}, you're on the list for <strong>${escapeHtml(event.title)}</strong>.
                </p>
                <table style="width:100%;border-collapse:collapse;margin-top:24px;font-size:15px">
                  <tr><td style="padding:12px 0;color:#8e8e93">Reference</td><td style="padding:12px 0;text-align:right;font-weight:600">#${String(ticket.id).padStart(4, "0")}</td></tr>
                  ${when ? `<tr><td style="padding:12px 0;color:#8e8e93;border-top:1px solid #f2f2f2">When</td><td style="padding:12px 0;text-align:right;font-weight:600;border-top:1px solid #f2f2f2">${escapeHtml(when)}</td></tr>` : ""}
                  <tr><td style="padding:12px 0;color:#8e8e93;border-top:1px solid #f2f2f2">Tickets</td><td style="padding:12px 0;text-align:right;font-weight:600;border-top:1px solid #f2f2f2">${ticket.quantity}</td></tr>
                  <tr><td style="padding:14px 0 0;color:#8e8e93;border-top:1px solid #f2f2f2">Total at the gate</td><td style="padding:14px 0 0;text-align:right;border-top:1px solid #f2f2f2;font-weight:700;font-size:18px;color:#297c80">${ticket.total_price} JOD</td></tr>
                </table>
                <p style="margin:24px 0 0;font-size:15px">See you there 🌴<br/><span style="color:#6b6b70">${CLUB_NAME}</span></p>
              </div>
            </div>
          </div>`,
      }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
    logAction(SYSTEM, "notify", `Event reservation #${ticket.id} (${ticket.name}): confirmation emailed`);
  } catch (err) {
    logAction(SYSTEM, "notify_failed", `Event reservation #${ticket.id}: ${String(err).slice(0, 200)}`);
  }
}
