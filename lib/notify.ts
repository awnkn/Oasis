import { CLUB_NAME } from "./config";
import { formatDateLong } from "./dates";
import { getBooking, logAction, type Booking } from "./bookings";

// Automatic guest notifications, sent when a booking is approved.
// Each channel activates only when its environment variables are set —
// with nothing configured, approval works exactly as before.
//
//   Email    → RESEND_API_KEY + EMAIL_FROM              (resend.com)
//   WhatsApp → WHATSAPP_TOKEN + WHATSAPP_PHONE_ID       (Meta Cloud API)
//              optional WHATSAPP_TEMPLATE (default "booking_confirmed")
//              optional WHATSAPP_LANG     (default "en")

const SYSTEM = { name: "System", role: "system" };

// Absolute base URL for assets inside emails.
const SITE_URL = process.env.SITE_URL || "https://oasis-i1qn.onrender.com";

function confirmationText(b: Booking): string {
  return (
    `Dear ${b.name.split(" ")[0]}, your ${CLUB_NAME} booking is confirmed! ` +
    `Reference #${String(b.id).padStart(4, "0")} · ${formatDateLong(b.date)} · ` +
    `${b.guests} ${b.guests === 1 ? "guest" : "guests"} · ` +
    `${b.total_price} JOD payable at the gate. We can't wait to welcome you 🌸`
  );
}

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
        <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:24px;color:#22454a">
          <div style="background:#102c30;border-radius:14px;padding:22px;text-align:center;margin-bottom:20px">
            <img src="${SITE_URL}/images/logo-white.png" alt="${CLUB_NAME}" height="44" style="height:44px" />
          </div>
          <h1 style="font-weight:600">Your day is confirmed 🌸</h1>
          <p>Dear ${b.name.split(" ")[0]},</p>
          <p>We're delighted to confirm your booking at <strong>${CLUB_NAME}</strong>.</p>
          <table style="width:100%;border-collapse:collapse;background:#f6f0e4;border-radius:12px">
            <tr><td style="padding:10px 16px">Reference</td><td style="padding:10px 16px"><strong>#${String(b.id).padStart(4, "0")}</strong></td></tr>
            <tr><td style="padding:10px 16px">Day</td><td style="padding:10px 16px"><strong>${formatDateLong(b.date)}</strong></td></tr>
            <tr><td style="padding:10px 16px">Guests</td><td style="padding:10px 16px"><strong>${b.guests}</strong></td></tr>
            <tr><td style="padding:10px 16px">Total at the gate</td><td style="padding:10px 16px"><strong>${b.total_price} JOD</strong></td></tr>
          </table>
          <p style="margin-top:16px">Please arrive with this reference. Changes need at least 24 hours' notice.</p>
          <p>See you at the oasis,<br/>${CLUB_NAME}</p>
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
                { type: "text", text: `#${String(b.id).padStart(4, "0")}` },
                { type: "text", text: formatDateLong(b.date) },
                { type: "text", text: String(b.guests) },
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

/** Pre-filled wa.me link so staff can send the confirmation manually. */
export function waMeLink(b: Booking): string {
  const digits = b.phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(confirmationText(b))}`;
}
