# Oasis — Design System (Master)

**Global source of truth for the website and the dashboard.**
Page-specific overrides live in `design-system/oasis/pages/`. An override wins
over this file; anything an override does not mention falls back to here.

Generated with the `ui-ux-pro-max` skill and reconciled against the shipped
brand. Where the skill's raw recommendation was overruled, the reason is
recorded under [Deviations](#deviations-from-the-generated-output) — the
recommendation was not silently dropped.

---

## 1. Product frame

| Field | Value |
|---|---|
| Product type | Booking / reservation service for a ladies-only swimming club |
| Surfaces | Marketing site (public) + operations dashboard (staff, `/admin`) |
| Stack | Next.js 15 (App Router), React 19, Tailwind CSS 4 |
| Pattern | Hero-centric + social proof (site) · Operations console (dashboard) |
| Style | Soft UI Evolution — soft depth, clear contrast, WCAG AA+ |
| Dials | Site: variance 4 / motion 3 / density 3 · Dashboard: variance 3 / motion 2 / density 8 |
| Locale | Amman, Jordan. Latin and Arabic titles both occur — never assume Latin. |

**Avoid** (from the skill's anti-pattern set for this product): bright neon
colour, harsh animation, dark mode. The product is a calm daylight brand; a
dark theme is out of scope and must not be half-introduced.

---

## 2. Colour

All colour is defined in `app/globals.css` under `@theme`. **Components may
not use raw Tailwind palette classes (`blue-600`, `zinc-400`, …) or inline hex
values.** Both are how the current drift happened.

### Brand scales

| Scale | Role |
|---|---|
| `oasis-*` | Lagoon teal. Brand identity, primary actions, focus. |
| `sand-*` | Warm shore. Page ground, warm surfaces. |
| `mist-*` | Cool blue. Secondary surfaces and the feature-card scheme. |
| `blush-*` | Soft accent. Notes and gentle emphasis only. |
| `ink*` | Text. See below — these are the only text colours. |
| `status-*` | Dashboard state. The only semantic non-brand hues. |

### Text — the ink contract

Body text uses `ink`, `ink-muted`, or `ink-subtle`. Nothing else.

| Token | Hex | Min contrast on any approved surface | Use |
|---|---|---|---|
| `ink` | `#123034` | 12.3:1 | Headings, primary copy |
| `ink-muted` | `#41595c` | 6.5:1 | Secondary copy, captions, table meta |
| `ink-subtle` | `#546a6d` | 5.0:1 | The lightest text permitted anywhere |

> **Opacity-modified text is banned.** `text-oasis-900/60`, `/50`, `/70` and
> friends measured **2.6:1 – 3.4:1** across the site — below the 4.5:1 floor.
> Approved surfaces for the table above: `white`, `sand-50`, `mist-100`,
> `blush-100`, `oasis-50`. On teal or photographic backgrounds use white text
> plus a scrim, and verify separately.

### Fills that carry white text

`oasis-600` (4.9:1) is the **lightest** permitted fill behind white text.
`oasis-500` and lighter are decoration only — never a text background.
`oasis-500` remains valid as a focus ring and as a non-text accent, where the
requirement is 3:1, which it meets at 3.4:1.

### Verifying

`npm run audit:contrast` re-computes every pair in this contract and exits
non-zero on a regression. Run it whenever a token changes.

---

## 3. Typography

Playfair Display (display) + Inter (body), loaded via `next/font` in
`app/layout.tsx`. Keep them — see [Deviations](#deviations-from-the-generated-output).

| Role | Class |
|---|---|
| Page title | `font-display text-4xl sm:text-5xl font-semibold` |
| Section title | `font-display text-2xl sm:text-3xl font-semibold` |
| Body | `text-base leading-relaxed` (never below 16px on the site) |
| Caption / meta | `text-sm` |
| Dashboard dense | `text-sm`, `text-xs` for table meta only — never for body prose |

Base body ≥ 16px, line-height ≥ 1.5. The dashboard may drop to `text-sm` for
tabular data; it may not drop below `text-xs` anywhere.

---

## 4. Spacing

Site (density 3 — spacious): section rhythm `py-24`, card padding `p-7`/`p-8`,
grid gaps `gap-6`/`gap-8`.

Dashboard (density 8 — dense): see the dashboard override.

---

## 5. Motion

Tier: **subtle**. Duration 150–300ms, ease-out. Motion must convey meaning
(state change, spatial continuity); decorative-only motion is not shipped.

`prefers-reduced-motion: reduce` is honoured globally in `globals.css` and
must not be overridden locally.

---

## 6. Icons

**No emoji as icons, ever** — and no typographic glyph standing in for one
(`→`, `←`, `✓`, `✦`, `▲`, `↗`). Emoji render inconsistently across platforms,
cannot inherit stroke weight, and are announced unpredictably by screen
readers.

Use `components/icons.tsx`: 24×24, `viewBox="0 0 24 24"`, `fill="none"`,
`stroke="currentColor"`, `strokeWidth={1.6}`, round caps and joins. Decorative
icons carry `aria-hidden`; an icon that is the only content of a control needs
an `aria-label` on the control.

---

## 7. Accessibility floor

Non-negotiable, in priority order:

1. Text contrast ≥ 4.5:1 (large text ≥ 3:1); non-text UI ≥ 3:1.
2. Visible focus on every interactive element. `outline-none` is only
   acceptable where `globals.css` already guarantees a replacement.
3. Touch targets ≥ 44×44px on the site; ≥ 32px with ≥ 8px spacing for dense
   dashboard table controls, which are pointer-first.
4. Every page has one `<main>`; nav-heavy pages carry a skip link.
5. Async feedback is announced — `role="alert"` for errors, `aria-live` for
   status. A colour change alone is not feedback.
6. Every form control has a visible label. Placeholder-as-label is not a
   label.
7. Images carry meaningful `alt`; decorative images carry `alt=""`.

---

## 8. Forms and feedback

Submit → loading → success or error, always. Buttons disable while pending
and say what they are doing. Errors appear next to the field that caused them
and describe the fix, not just the failure.

---

## Deviations from the generated output

The skill's `--design-system` run is a starting point, not an order. Three of
its recommendations were overruled:

| Generated | Shipped | Why |
|---|---|---|
| Palette: soft pink `#EC4899` + lavender `#8B5CF6` | Existing lagoon teal | The teal brand is established across a logo, photography, and a physical venue. Repainting the product to match a generic "feminine wellness" palette would be brand vandalism dressed up as governance. The teal scale was audited and fixed instead. |
| Type: Lora / Raleway | Existing Playfair Display / Inter | Same reason. The shipped pairing already reads calm-and-editorial and carries the brand; swapping it buys nothing and costs identity. |
| Dashboard: "Exaggerated Minimalism" + Fira Code, `clamp(3rem, 10vw, 12rem)` headings | Soft UI Evolution, dense operations layout | A misroute. The query returned a **fashion/luxury landing-page** pattern for a query about an admin data table. Oversized editorial type is actively wrong for a booking console where staff scan dozens of rows. |

What **was** taken from the skill: the Soft UI Evolution style direction, the
density and motion tiers, the accessibility and forms rule sets, the
icon-discipline rule, and the pre-delivery checklist.
