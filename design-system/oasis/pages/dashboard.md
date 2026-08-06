# Override — Dashboard (`/admin/*`)

Applies to `/admin`, `/admin/events`, `/admin/insights`, `/admin/activity`.
Everything not stated here falls back to `MASTER.md`.

Dials: variance 3 (centred / minimal) · motion 2 (subtle) · **density 8 (dense)**.

---

## Density

The dashboard is a scanning surface. Spacing scale is `8 / 12 / 16 / 24 / 32px`
(`gap-2` … `gap-8`), against the site's `24 / 32 / 48 / 64 / 96px`.

| Element | Site | Dashboard |
|---|---|---|
| Section rhythm | `py-24` | `py-6` / `py-8` |
| Card padding | `p-7` / `p-8` | `p-4` / `p-5` |
| Table row | — | `py-2.5`, `text-sm` |
| Control | `py-3` | `py-1.5` / `py-2` |

## Touch targets

Dashboard controls are pointer-first and sit inside dense table rows, so the
site's 44px floor is relaxed to **32px minimum with ≥ 8px spacing** — the
`min-h-8` + `gap-2` pairing. Anything a phone user is expected to hit on the
go (login, primary actions, the assistant launcher) keeps the full 44px.

Inline `<select>` controls in table cells are the tightest element on the
surface; they carry `min-h-8` and must not be shrunk further.

## Status colour

Booking state is carried by the `status-*` tokens, and **never by colour
alone** — every status also carries its label as text. The mapping is fixed:

| State | Token | Reads as |
|---|---|---|
| open | `status-neutral` | new, no action yet |
| contacted | `status-info` | reached out, in progress |
| no response | `status-caution` | waiting on the guest |
| confirmed | `status-positive` | they are coming |
| checked in | `oasis-700` | through the gate |
| cancelled | `status-critical` | spot released |

## Charts

Chart colour comes from the token set via CSS variables — **no inline hex in
SVG**. Series colours in order: `oasis-600`, `sand-600`, `mist-600`,
`blush-500`. Axis and label text uses `ink-muted` at full opacity, not an
opacity-faded ink.

Every chart needs an accessible name, and any series distinguished by colour
also needs a text label or legend entry.

## Tables

Wide tables scroll inside their own `overflow-x-auto` container so the page
body never scrolls horizontally. Sortable headers are real `<button>`s with
`aria-sort` on the `<th>`, not clickable text with a glyph.

## Motion

Tier 2. State changes only — row highlight, modal enter. No scroll
choreography anywhere in `/admin`.
