import type { ReactNode } from "react";
import { cx } from "./cx";

/**
 * The reference had six badge treatments — six background alphas of one accent
 * color, three trackings, two text colors. These are the five meanings a badge
 * actually carries here.
 */

type Tone = "neutral" | "brand" | "success" | "danger" | "inverse";

export type BadgeProps = {
  children: ReactNode;
  tone?: Tone;
  iconStart?: ReactNode;
  /** Off for a label that reads as a phrase rather than a tag. */
  caps?: boolean;
};

const tones: Record<Tone, string> = {
  neutral: "bg-surface-sunken text-content-secondary",
  brand: "bg-surface-brand/65 text-brand-hover",
  success: "bg-surface-raised text-success border border-success",
  danger: "bg-surface-raised text-danger border border-danger",
  // For sitting on top of photography, where the surface behind is unknown.
  inverse: "bg-surface-inverse text-content-on-photo",
};

export function Badge({ children, tone = "neutral", iconStart, caps = true }: BadgeProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-pill px-3",
        caps ? "text-micro py-1 font-medium uppercase" : "text-caption py-1.5 font-semibold",
        "whitespace-nowrap",
        tones[tone],
      )}
    >
      {iconStart}
      {children}
    </span>
  );
}
