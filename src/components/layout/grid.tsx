import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";

/**
 * Two-dimensional layout with a fixed set of responsive ladders.
 *
 * `cols` is the count at the widest breakpoint; the ladder down to one column is
 * decided here rather than at each call site, so two grids of the same kind cannot
 * disagree about when they collapse.
 */

export type GridProps = {
  children: ReactNode;
  cols?: 2 | 3 | 4 | 5;
  gap?: 3 | 4 | 5 | 6 | 8;
  /** `start` lets each cell keep its own height — for cards that expand. */
  align?: "stretch" | "start";
  /** Two columns from the narrowest width — for a grid of pictures. */
  fromTwo?: boolean;
  /** A form's two-column field grid, where fields may span both. */
  form?: boolean;
};

const ladders = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5",
} as const;

/* The same ladders, starting at two. A catalogue of photographs on a phone is a
   pair of columns, not a stack of full-width pictures. */
const twoUp = {
  2: "grid-cols-2",
  3: "grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  5: "grid-cols-2 lg:grid-cols-4 xl:grid-cols-5",
} as const;

const gaps = { 3: "gap-3", 4: "gap-4", 5: "gap-5", 6: "gap-6", 8: "gap-8" } as const;

/* Two columns on a phone leave about 165px each; the desktop gutter would spend
   a quarter of the difference on nothing. */
const twoUpGaps = {
  3: "gap-2 sm:gap-3",
  4: "gap-2 sm:gap-4",
  5: "gap-3 sm:gap-5",
  6: "gap-3 sm:gap-6",
  8: "gap-3 sm:gap-8",
} as const;

export function Grid({
  children,
  cols = 3,
  gap = 6,
  form = false,
  align = "stretch",
  fromTwo = false,
}: GridProps) {
  return (
    <div
      className={cx(
        "grid",
        form ? "grid-cols-1 sm:grid-cols-2" : fromTwo ? twoUp[cols] : ladders[cols],
        fromTwo ? twoUpGaps[gap] : gaps[gap],
        align === "start" && "items-start",
      )}
    >
      {children}
    </div>
  );
}
