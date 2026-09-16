export type BlobMarkProps = {
  /** Matches the places the mark appears: nav lockup, hero lockup, background wash. */
  size?: 24 | 32 | 56 | 64;
  /** A background wash: renders at the container's size and is inert. */
  fill?: boolean;
};

const sizes = { 24: "size-6", 32: "size-8", 56: "size-14", 64: "size-16" } as const;

/**
 * The mark, traced from the supplied artwork.
 *
 * Two things differ from the reference's version, and both matter.
 *
 * The silhouette is the real one: the reference drew a rounded rectangle with a
 * flat left edge, which is not this shape — this has a swept left flank and a
 * notch cut into the right side. Traced from the PNG at 1095×1043 and fitted to a
 * 120×120 box, centred; 33 segments, and pixel-diffed against the original at 64px
 * and 256px, where a finer trace was no closer.
 *
 * The cut-outs are real holes, via `fill-rule="evenodd"`, rather than ellipses
 * painted in the page colour. The reference filled them with `var(--cream)`, so the
 * mark was only correct on the page surface — on the hero's raised surface, or over
 * a photograph, the cut-outs were quietly the wrong colour. Holes take whatever is
 * behind them, which is what a cut-out means.
 *
 * One path, `currentColor`, so it tints from what it inherits and works at 24px in
 * the nav and at 30rem as a background wash.
 */

const D =
  "M52.77 117.03C49.45 116.98 42.62 116.86 37.59 116.76C32.56 116.67 23.26 116.56 16.93 116.53L5.42 116.47L4.96 115.44C-1.62 100.68 -1.63 82.05 4.93 62.96C8.36 53.0 13.86 43.01 19.39 36.7C19.99 36.01 21.06 34.74 21.77 33.86C29.16 24.73 35.54 18.75 43.29 13.67C61.14 1.98 82.05 -0.34 101.26 7.24C118.99 14.23 124.67 29.72 115.94 47.27C110.24 58.73 102.22 63.43 92.74 60.87C91.12 60.43 86.45 59.67 82.09 59.13C69.95 57.62 58.11 57.85 50.3 59.73C47.28 60.46 46.36 60.9 46.79 61.42C47.09 61.78 48.04 61.83 55.67 61.92C63.09 62.01 64.68 62.07 68.77 62.41C78.48 63.22 89.94 65.39 94.79 67.34C105.35 71.58 111.97 82.21 110.9 93.21C109.93 103.2 103.06 111.53 92.09 116.04C90.62 116.64 90.36 116.67 85.21 116.94C82.31 117.09 60.41 117.15 52.77 117.03ZM64.38 89.78C65.14 89.39 65.75 88.54 65.75 87.9C65.75 84.86 57.25 78.99 45.67 74.04C40.03 71.63 36.26 70.62 34.37 71.01C33.19 71.26 32.41 72.3 32.58 73.39C32.83 74.91 35.95 77.89 40.42 80.87C47.13 85.34 54.99 88.9 60.33 89.88C61.83 90.15 63.76 90.11 64.38 89.78ZM42.64 51.11C51.26 49.64 70.76 36.83 71.67 32.03C72.01 30.22 70.7 28.12 68.59 27.08C66.6 26.11 64.86 26.03 62.98 26.82C57.35 29.2 45.95 37.93 41.14 43.54C37.49 47.8 37.02 50.4 39.77 51.14C40.47 51.33 41.43 51.32 42.64 51.11Z";

export function BlobMark({ size = 32, fill = false }: BlobMarkProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={fill ? "size-full" : sizes[size]}
      aria-hidden="true"
      focusable="false"
    >
      <path d={D} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}
