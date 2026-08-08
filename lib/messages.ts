// The guest booking-confirmation message (WhatsApp / manual send). Kept in
// one place so the manual "WhatsApp" button and the server both use the
// exact same wording. No server-only imports, so it is safe on the client.

export interface BookingMessageInput {
  firstName: string;
  /** Zero-padded reference without the "#", e.g. "0198". */
  reference: string;
  /** Long date, e.g. "Friday, 7 August 2026". */
  dateLong: string;
  guests: number;
  /** Total amount in JOD (number only). */
  total: number;
}

export function bookingConfirmationText(p: BookingMessageInput): string {
  const guestWord = p.guests === 1 ? "guest" : "guests";
  return [
    `Dear ${p.firstName}, your Oasis booking is confirmed!`,
    "",
    `Reference #${p.reference}`,
    `· ${p.dateLong}`,
    `· ${p.guests} ${guestWord}`,
    `· TOTAL AMOUNT: ${p.total} JOD payable at the gate (Cash or CliQ payment only)`,
    "",
    "Please note the following before your visit:",
    "· Oasis by Azara is 16+ only. Guests under the age of 16 will not be permitted entry.",
    "· No outside food or drinks are allowed inside the venue.",
    "· Photography and videography are not permitted. Guests who do not comply with this policy will be asked to leave the venue.",
    "· Please keep your personal belongings and valuables with you at all times. Oasis by Azara is not responsible for lost, damaged, or ruined personal items.",
    "",
    "Please reply with “Confirmed” within 24 hours to secure your booking. If we do not receive your confirmation within 24 hours, your reservation will be considered cancelled and released to other guests.",
    "",
    "We can’t wait to welcome you to Oasis",
  ].join("\n");
}
