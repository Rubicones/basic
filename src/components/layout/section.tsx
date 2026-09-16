import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";

/**
 * Vertical rhythm, in one place.
 *
 * The reference gave four peer sections four different rhythms — 80/112, 64/80,
 * 56/80 and 40 — so the page had no meter at all. Three sizes cover everything
 * here, and equivalent hierarchy levels get the same one at every breakpoint.
 */

export type SectionProps = {
  children: ReactNode;
  /** Anchor target for in-page navigation. */
  id?: string;
  size?: "compact" | "default" | "loose";
  tone?: "page" | "raised" | "sunken";
  /** Adds a hairline above, for sections that meet without a color change. */
  divided?: boolean;
  as?: "section" | "footer" | "header" | "div";
  labelledBy?: string;
  /** Inert artwork behind the content — the reference's background marks. */
  decoration?: ReactNode;
};

const sizes = {
  compact: "py-14 lg:py-18",
  default: "py-20 lg:py-28",
  loose: "py-28 lg:py-40",
} as const;

const tones = {
  page: "bg-surface-page",
  raised: "bg-surface-raised",
  sunken: "bg-surface-sunken",
} as const;

export function Section({
  children,
  id,
  size = "default",
  tone = "page",
  divided = false,
  as: Tag = "section",
  labelledBy,
  decoration,
}: SectionProps) {
  return (
    <Tag
      id={id}
      aria-labelledby={labelledBy}
      className={cx(
        sizes[size],
        tones[tone],
        divided && "border-line border-t",
        Boolean(decoration) && "relative overflow-hidden",
        // Anchored sections must clear the fixed header when jumped to.
        id && "scroll-mt-header",
      )}
    >
      {decoration && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {decoration}
        </div>
      )}
      {decoration ? <div className="relative">{children}</div> : children}
    </Tag>
  );
}
