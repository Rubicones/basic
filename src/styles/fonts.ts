import localFont from "next/font/local";
import type { Locale } from "@/lib/i18n/config";

/**
 * Fonts are self-hosted, not fetched from Google.
 *
 * Three reasons: the build stops depending on a network call, no visitor request
 * leaves for a third party, and each file carries exactly the weights we use —
 * subsets merged into one woff2 per weight, so a page makes one request per face.
 *
 * `adjustFontFallback` derives size-adjust and the metric overrides from the file
 * itself, so the fallback occupies the same space and swapping in the real face
 * shifts nothing.
 *
 * Nothing is preloaded. next/font preloads per entry, not per branch, so with two
 * locale-dependent pairs imported from one module every page preloaded three faces
 * — two of which it would never use. Since the fallback is metric-matched, the
 * swap costs a brief flash and zero layout shift, which is the cheaper trade. If
 * the flash on the hero heading proves objectionable when Phase 4 measures LCP,
 * the fix is a hand-written <link rel="preload"> keyed to the locale.
 *
 * Every family below exposes the same two variables — `--font-display-face` and
 * `--font-body-face` — so the token layer never learns that locales differ. The layout
 * picks a pair; globals.css is untouched by the choice.
 */

/* ---- Latin: Serbian and English -------------------------------------------- */

const outfit = localFont({
  src: [
    { path: "./fonts/outfit-700.woff2", weight: "700", style: "normal" },
    { path: "./fonts/outfit-800.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-display-face",
  display: "swap",
  fallback: ["Trebuchet MS", "ui-sans-serif", "system-ui", "sans-serif"],
  adjustFontFallback: "Arial",
  preload: false,
});

const dmSans = localFont({
  src: [
    { path: "./fonts/dm-sans-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/dm-sans-500.woff2", weight: "500", style: "normal" },
    /* 700 is loaded because the reference applied `font-bold` to DM Sans while
       loading only 400/500 — every one of those rendered as faux bold. 600 is
       deliberately absent: `font-semibold` on body text is a mistake, not a weight. */
    { path: "./fonts/dm-sans-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-body-face",
  display: "swap",
  fallback: ["Helvetica Neue", "ui-sans-serif", "system-ui", "sans-serif"],
  adjustFontFallback: "Arial",
  preload: false,
});

/* ---- Cyrillic: Russian ------------------------------------------------------ */

/**
 * Neither Outfit nor DM Sans ships Cyrillic, so Russian gets Onest — chosen by
 * measuring candidates against both, not by eye:
 *
 *                x-height   cap    avg advance
 *   Outfit 800      0.489   0.709      0.5369
 *   Onest 800       0.527   0.708      0.5507   ← closest of four tested
 *   DM Sans 400     0.504   0.700      0.5218
 *   Onest 400       0.527   0.707      0.5274   ← closest of three tested
 *
 * Cap heights match to within 0.001 em and advances to within 0.014 em, so
 * Russian sets to nearly the same line length and colour as the other two locales.
 * Unbounded was 39% wider and Manrope's ascender 0.07 em taller; both were out.
 *
 * The tradeoff: Russian runs on one family where the others run on two, so the
 * display/body contrast is carried by weight (800 vs 400) rather than by shape.
 * Onest is geometric enough at 800 to hold a heading, and using one family keeps
 * a second type system from being invented for a single locale.
 */

const onestDisplay = localFont({
  src: [
    /* 700 and 800, matching Outfit — so `font-bold` on a display element is a real
       face in both locales rather than a synthesised one. */
    { path: "./fonts/onest-700.woff2", weight: "700", style: "normal" },
    { path: "./fonts/onest-800.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-display-face",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
  adjustFontFallback: "Arial",
  preload: false,
});

const onestBody = localFont({
  src: [
    { path: "./fonts/onest-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/onest-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/onest-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-body-face",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
  adjustFontFallback: "Arial",
  preload: false,
});

/** The class names to put on `<html>` for a locale. */
export function fontClassNames(locale: Locale): string {
  return locale === "ru"
    ? `${onestDisplay.variable} ${onestBody.variable}`
    : `${outfit.variable} ${dmSans.variable}`;
}
