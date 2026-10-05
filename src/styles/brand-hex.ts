/**
 * The palette in sRGB hex, for the few consumers that cannot read CSS custom
 * properties or oklch(): the generated social card (Satori renders neither) and
 * `<meta name="theme-color">`. Approximations of the tokens in globals.css —
 * change those first, then mirror the change here.
 *
 * The second file, after globals.css, that scripts/check-arbitrary.mjs lets hold
 * raw colors.
 */
export const BRAND_HEX = {
  /** --color-surface-page */
  page: "#f9f5ea",
  /** --color-surface-inverse, as text */
  ink: "#34354a",
  /** --color-brand */
  brand: "#e3735a",
  /** --color-brand at low strength, for decoration */
  brandSoft: "#f6dccf",
  /** --color-content-on-brand */
  onBrand: "#fffdf8",
} as const;
