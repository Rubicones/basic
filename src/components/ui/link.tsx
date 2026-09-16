import NextLink from "next/link";
import type { ReactNode } from "react";
import { cx } from "./cx";

/**
 * Links come in two shapes: inline in prose, and a link that looks like a button.
 * Keeping them apart stops a navigation from being written as a `<button>` with an
 * onClick, which is how a site loses middle-click, open-in-new-tab and crawlability.
 */

type Tone = "inline" | "quiet" | "button" | "buttonOutline";
type Size = "sm" | "md" | "lg";

export type LinkProps = {
  href: string;
  children: ReactNode;
  tone?: Tone;
  /** Only meaningful for tone="button". */
  size?: Size;
  iconEnd?: ReactNode;
  external?: boolean;
  prefetch?: boolean;
};

const tones: Record<Tone, string> = {
  inline:
    "text-brand underline underline-offset-4 decoration-1 hover:decoration-2 transition-ink",
  quiet:
    "text-content-secondary hover:text-brand transition-ink no-underline",
  button: cx(
    "inline-flex items-center justify-center gap-2 rounded-pill no-underline",
    "font-display font-bold whitespace-nowrap",
    "bg-brand text-content-on-brand hover:bg-brand-hover shadow-soft hover:shadow-lift",
    "transition-control active:translate-y-px",
  ),
  buttonOutline: cx(
    "inline-flex items-center justify-center gap-2 rounded-pill no-underline",
    "font-display font-bold whitespace-nowrap",
    "border border-line-control bg-surface-raised text-content-primary",
    "hover:border-brand hover:text-brand",
    "transition-control active:translate-y-px",
  ),
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-4 text-caption",
  md: "h-11 px-6 text-body-sm",
  lg: "h-13 px-8 text-body",
};

export function Link({
  href,
  children,
  tone = "inline",
  size = "md",
  iconEnd,
  external = false,
  prefetch,
}: LinkProps) {
  const classes = cx(tones[tone], (tone === "button" || tone === "buttonOutline") && sizes[size]);

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        {children}
        {iconEnd}
      </a>
    );
  }

  return (
    <NextLink href={href} {...(prefetch === undefined ? {} : { prefetch })} className={classes}>
      {children}
      {iconEnd}
    </NextLink>
  );
}
