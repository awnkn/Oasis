/**
 * Contrast audit for the Oasis token contract.
 *
 * Reads the real token values out of app/globals.css, re-computes every
 * foreground/background pair the design system promises, and exits non-zero
 * if any pair drops below its WCAG threshold. Run it whenever a token moves.
 *
 *   node scripts/audit-contrast.mjs      (or: npm run audit:contrast)
 *
 * It also greps the UI for the idioms the contract bans — raw Tailwind
 * palette classes, opacity-modified text, inline hex — because a token that
 * passes here is worthless if components bypass it.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const CSS = readFileSync("app/globals.css", "utf8");

/** Pull `--color-x: #hex;` pairs out of the @theme block. */
function tokens() {
  const out = {};
  for (const m of CSS.matchAll(/--color-([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    out[m[1]] = m[2];
  }
  return out;
}

const T = tokens();

function channel(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function tok(name) {
  const v = T[name];
  if (!v) throw new Error(`token --color-${name} not found in app/globals.css`);
  return v;
}

// --- the contract -----------------------------------------------------------

const TEXT = 4.5; // normal body text
const UI = 3.0; // non-text UI and large text

/** Every ink token must clear 4.5:1 on every approved light surface. */
const SURFACES = ["surface", "sand-50", "mist-100", "blush-100", "oasis-50"];
const INKS = ["ink", "ink-muted", "ink-subtle"];

const pairs = [];

for (const ink of INKS) {
  for (const s of SURFACES) {
    pairs.push([`${ink} on ${s}`, tok(ink), tok(s), TEXT]);
  }
}

// Status foregrounds on white and on their own tint.
for (const s of ["positive", "caution", "critical", "info", "neutral"]) {
  pairs.push([`status-${s} on surface`, tok(`status-${s}`), tok("surface"), TEXT]);
  pairs.push([
    `status-${s} on its tint`,
    tok(`status-${s}`),
    tok(`status-${s}-tint`),
    TEXT,
  ]);
}

// Solid brand fills that carry white text. oasis-600 is the documented floor.
for (const s of ["600", "700", "800", "900", "950"]) {
  pairs.push([`white on oasis-${s}`, tok("surface"), tok(`oasis-${s}`), TEXT]);
}
pairs.push(["white on mist-600", tok("surface"), tok("mist-600"), TEXT]);
pairs.push(["mist-700 on mist-50", tok("mist-700"), tok("mist-50"), TEXT]);
pairs.push(["mist-950 on mist-50", tok("mist-950"), tok("mist-50"), TEXT]);
pairs.push(["oasis-600 on surface", tok("oasis-600"), tok("surface"), TEXT]);
pairs.push(["sand-800 on sand-50", tok("sand-800"), tok("sand-50"), TEXT]);

// Non-text: the focus ring must be visible against the page.
pairs.push(["focus ring oasis-600 vs surface", tok("oasis-600"), tok("surface"), UI]);
pairs.push(["focus ring oasis-600 vs sand-50", tok("oasis-600"), tok("sand-50"), UI]);

// --- run --------------------------------------------------------------------

let failed = 0;
console.log("Contrast audit — app/globals.css\n");
for (const [name, fg, bg, need] of pairs) {
  const r = ratio(fg, bg);
  const ok = r >= need;
  if (!ok) failed++;
  console.log(
    `  ${ok ? "PASS" : "FAIL"}  ${r.toFixed(2).padStart(5)}:1  (need ${need})  ${name}`
  );
}

// --- banned idioms ----------------------------------------------------------

const BANNED = [
  [
    /(?:bg|text|border|ring|from|via|to|shadow|divide)-(?:blue|zinc|slate|gray|neutral|stone|red|green|amber|emerald|teal|rose|sky|indigo|violet|purple|orange|lime|cyan)-\d/g,
    "raw Tailwind palette class (use a token from globals.css)",
  ],
  [
    /text-(?:oasis|sand|blush|mist)-\d{2,3}\/\d{1,3}/g,
    "opacity-modified text (use ink / ink-muted / ink-subtle)",
  ],
  [/(?:fill|stroke)="#[0-9a-fA-F]{6}"/g, "inline hex in SVG (use var(--color-*))"],
];

function walk(dir, acc = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (p.endsWith(".tsx")) acc.push(p);
  }
  return acc;
}

console.log("\nBanned idioms\n");
let violations = 0;
for (const file of [...walk("app"), ...walk("components")]) {
  const src = readFileSync(file, "utf8");
  for (const [re, why] of BANNED) {
    for (const m of src.matchAll(re)) {
      const line = src.slice(0, m.index).split("\n").length;
      console.log(`  ${file}:${line}  ${m[0]}  — ${why}`);
      violations++;
    }
  }
}
if (!violations) console.log("  none");

const bad = failed + violations;
console.log(
  `\n${bad === 0 ? "OK" : "FAILED"} — ${failed} contrast failure(s), ${violations} banned idiom(s)`
);
process.exit(bad === 0 ? 0 : 1);
