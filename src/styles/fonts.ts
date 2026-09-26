import localFont from "next/font/local";

/**
 * Two faces: Unbounded for headings, SF Pro for everything else.
 *
 * Unbounded is self-hosted — OFL-licensed (unbounded-OFL.txt sits next to the
 * files), so it may be served from here, and nothing leaves for a third party.
 * One woff2 per weight, cut down to what the three locales actually use: Basic
 * Latin and Latin-1, Latin Extended-A (č ć đ š ž), and the Cyrillic block
 * (Russian, and Serbian's ђ ј љ њ ћ џ), plus «» — – № €. 37 KB a weight instead
 * of the 110 KB the full font would be.
 *
 * It covers Cyrillic, so Russian no longer needs a family of its own for
 * headings — every locale sets in the same face, and the per-locale pair this
 * module used to pick is gone.
 *
 * SF Pro is *not* here, because it cannot be: Apple's licence allows it on Apple
 * platforms and does not allow serving it as a web font. So body text names the
 * system face — `-apple-system` is SF Pro on every iPhone, iPad and Mac — and
 * falls back to each other platform's own interface face (Segoe UI, Roboto). See
 * `--font-sans` in globals.css. Nothing is downloaded for body text at all.
 *
 * Preloaded now: with one heading family for every locale there is no longer a
 * branch whose faces would be fetched for nothing, and the hero heading is the
 * largest thing on the first screen.
 */

const unbounded = localFont({
  src: [
    { path: "./fonts/unbounded-700.woff2", weight: "700", style: "normal" },
    { path: "./fonts/unbounded-800.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-display-face",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
  // Unbounded is far wider than any system face; the metric overrides next/font
  // derives from the file keep the fallback occupying the same space, so the
  // swap does not reflow the heading.
  adjustFontFallback: "Arial",
  preload: true,
});

/** The class names to put on `<html>` — the same for every locale now. */
export function fontClassNames(): string {
  return unbounded.variable;
}
