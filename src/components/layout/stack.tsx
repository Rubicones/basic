import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";

/**
 * One-dimensional layout. Gaps come from the scale, never from a margin on a
 * child — margins on children are how spacing becomes a property of the wrong
 * element and stops being consistent.
 */

export type StackProps = {
  children: ReactNode;
  direction?: "row" | "column";
  /** Steps on the 4px scale: 1=4px … 12=48px. */
  gap?: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12;
  align?: "start" | "center" | "end" | "baseline" | "stretch";
  justify?: "start" | "center" | "end" | "between";
  wrap?: boolean;
  /** Stacks into a column below `sm`, regardless of `direction`. */
  responsive?: boolean;
};

const gaps = {
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  5: "gap-5",
  6: "gap-6",
  8: "gap-8",
  10: "gap-10",
  12: "gap-12",
} as const;

const aligns = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  baseline: "items-baseline",
  stretch: "items-stretch",
} as const;

const justifies = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
} as const;

export function Stack({
  children,
  direction = "column",
  gap = 4,
  align = "stretch",
  justify = "start",
  wrap = false,
  responsive = false,
}: StackProps) {
  return (
    <div
      className={cx(
        "flex min-w-0",
        responsive ? "flex-col sm:flex-row" : direction === "row" ? "flex-row" : "flex-col",
        gaps[gap],
        aligns[align],
        justifies[justify],
        wrap && "flex-wrap",
      )}
    >
      {children}
    </div>
  );
}
