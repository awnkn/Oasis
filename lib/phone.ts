// Country calling codes offered in the booking form. `min`/`max` bound the
// national number length (digits after the country code, leading zero
// stripped). Jordan first — it's the default.

export interface PhoneCountry {
  code: string;
  name: string;
  flag: string;
  dial: string;
  min: number;
  max: number;
}

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: "JO", name: "Jordan", flag: "🇯🇴", dial: "962", min: 8, max: 9 },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", dial: "966", min: 8, max: 9 },
  { code: "AE", name: "UAE", flag: "🇦🇪", dial: "971", min: 8, max: 9 },
  { code: "KW", name: "Kuwait", flag: "🇰🇼", dial: "965", min: 7, max: 8 },
  { code: "QA", name: "Qatar", flag: "🇶🇦", dial: "974", min: 7, max: 8 },
  { code: "BH", name: "Bahrain", flag: "🇧🇭", dial: "973", min: 7, max: 8 },
  { code: "OM", name: "Oman", flag: "🇴🇲", dial: "968", min: 7, max: 8 },
  { code: "IQ", name: "Iraq", flag: "🇮🇶", dial: "964", min: 9, max: 10 },
  { code: "PS", name: "Palestine", flag: "🇵🇸", dial: "970", min: 8, max: 9 },
  { code: "LB", name: "Lebanon", flag: "🇱🇧", dial: "961", min: 7, max: 8 },
  { code: "SY", name: "Syria", flag: "🇸🇾", dial: "963", min: 8, max: 9 },
  { code: "EG", name: "Egypt", flag: "🇪🇬", dial: "20", min: 9, max: 10 },
  { code: "TR", name: "Türkiye", flag: "🇹🇷", dial: "90", min: 10, max: 10 },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", dial: "44", min: 9, max: 10 },
  { code: "US", name: "USA / Canada", flag: "🇺🇸", dial: "1", min: 10, max: 10 },
  { code: "DE", name: "Germany", flag: "🇩🇪", dial: "49", min: 9, max: 11 },
  { code: "FR", name: "France", flag: "🇫🇷", dial: "33", min: 9, max: 9 },
];

export const DEFAULT_PHONE_COUNTRY = "JO";

/** Keep digits only, drop a leading zero (local dialing prefix), cap length. */
export function normalizeNationalNumber(
  raw: string,
  country: PhoneCountry
): string {
  return raw.replace(/\D/g, "").replace(/^0+/, "").slice(0, country.max);
}
