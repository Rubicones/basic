import { cx } from "./cx";

/**
 * A shape that stands in for content while it loads.
 *
 * It matches the size of what is coming so nothing moves when the real thing
 * arrives — a spinner in the middle of a page tells you to wait; this tells you
 * what you are waiting for. The pulse is opacity only, and it stops entirely
 * under prefers-reduced-motion via the global rule.
 */

export type SkeletonProps = {
  shape?: "line" | "title" | "block" | "circle";
  /** Tailwind-free: a fraction of the container, so it works in any column. */
  width?: "full" | "3/4" | "1/2" | "1/3" | "1/4";
  lines?: number;
};

const widths = {
  full: "w-full",
  "3/4": "w-3/4",
  "1/2": "w-1/2",
  "1/3": "w-1/3",
  "1/4": "w-1/4",
} as const;

const shapes = {
  line: "h-4 rounded-xs",
  title: "h-8 rounded-xs",
  block: "aspect-photo w-full rounded-card",
  circle: "size-11 rounded-pill",
} as const;

export function Skeleton({ shape = "line", width = "full", lines = 1 }: SkeletonProps) {
  const one = (key: number, w: keyof typeof widths) => (
    <span
      key={key}
      aria-hidden="true"
      className={cx("bg-surface-sunken block animate-pulse", shapes[shape], widths[w])}
    />
  );

  if (lines === 1) return one(0, width);

  return (
    <span className="flex flex-col gap-2">
      {Array.from({ length: lines }, (_, i) =>
        // The last line runs short, the way a paragraph does.
        one(i, i === lines - 1 ? "1/2" : width),
      )}
    </span>
  );
}
