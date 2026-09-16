import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";
import { IconSpinner } from "./icon";

/**
 * The one button.
 *
 * The reference had ten solid-pill usages across five accidental heights, two of
 * which had a hover treatment the other eight lacked. Size here is a height, never
 * padding — sizing a control by padding is exactly what produced `py-2`, `py-2.5`,
 * `py-3` and `py-3.5` for one control.
 *
 * There is no `className`. A screen that needs something this cannot express adds
 * a variant here.
 */

type Variant = "solid" | "solidWipe" | "outline" | "ghost" | "danger" | "inverse";
type Size = "sm" | "md" | "lg";
/** `circle` is an icon-only control: square box, no label padding. */
type Shape = "pill" | "circle";

export type ButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "className" | "style" | "children"
> & {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  shape?: Shape;
  /** Disables the button, swaps the leading icon for a spinner, sets aria-busy. */
  loading?: boolean;
  loadingLabel?: string;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  fullWidth?: boolean | "untilSm";
};

const base = cx(
  "relative inline-flex items-center justify-center gap-2 rounded-pill",
  "font-display font-bold whitespace-nowrap",
  "transition-control",
  "active:translate-y-px",
  "disabled:pointer-events-none disabled:shadow-none",
);

/* The non-brand variants keep the explicit disabled surface: fading them with
   opacity puts the label's contrast at the mercy of whatever is behind the
   button. These colors are fixed and measurable at 5.93:1. */
const DISABLED_SURFACE =
  "disabled:bg-surface-sunken disabled:text-content-secondary disabled:border-line";

const variants: Record<Variant, string> = {
  // 5.05:1 label on fill. The reference's coral fill gave 2.97:1 — no label color
  // could have fixed it, so the fill is what changed.
  /* Disabled keeps the clay fill at 40%, as the reference had it. That composites
     fill and label toward the page together, so the label lands near 2.6:1 — a
     deliberate call, same as keeping the palette itself. The fixed surface is
     still what every non-brand variant uses. */
  solid:
    "bg-brand text-content-on-brand hover:bg-brand-hover shadow-soft hover:shadow-lift disabled:bg-brand disabled:text-content-on-brand disabled:opacity-40",
  /* The card's add button. A dark panel wipes across from the left on hover — the
     reference's one genuinely distinctive button treatment, which it then applied
     to two of its ten buttons and forgot on the other eight. Here it is a variant,
     used where it belongs. */
  solidWipe:
    "group/wipe bg-brand text-content-on-brand shadow-soft hover:shadow-lift overflow-hidden disabled:bg-brand disabled:text-content-on-brand disabled:opacity-40",
  outline:
    "border border-line-control text-content-primary bg-surface-raised hover:border-brand hover:text-brand " +
    DISABLED_SURFACE,
  ghost: "text-brand hover:bg-surface-brand " + DISABLED_SURFACE,
  danger: "bg-danger text-content-on-brand hover:brightness-90 " + DISABLED_SURFACE,
  /* The ink circle on the catalogue card. The reference had no button this dark;
     the palette did — it is the same ink the card wipes across on hover. */
  inverse:
    "bg-surface-inverse text-content-on-photo shadow-soft hover:shadow-lift hover:brightness-125 " +
    DISABLED_SURFACE,
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-4 text-caption",
  md: "h-11 px-6 text-body-sm",
  lg: "h-13 px-8 text-body",
};

/** Same heights, no horizontal padding: the box stays square. */
const circles: Record<Size, string> = {
  sm: "size-8",
  md: "size-11",
  lg: "size-13",
};

export function Button({
  children,
  variant = "solid",
  size = "md",
  shape = "pill",
  loading = false,
  loadingLabel,
  iconStart,
  iconEnd,
  fullWidth = false,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  const iconSize = size === "lg" ? 20 : 16;

  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        base,
        variants[variant],
        shape === "circle" ? circles[size] : sizes[size],
        fullWidth === "untilSm" ? "w-full sm:w-auto" : fullWidth && "w-full",
      )}
    >
      {variant === "solidWipe" && (
        <span aria-hidden="true" className="ink-wipe bg-surface-inverse absolute inset-0" />
      )}
      <span className="relative flex items-center">
        {loading ? <IconSpinner size={iconSize} /> : iconStart}
      </span>
      {/* The label stays mounted while loading so the button keeps its width and
          the row does not reflow around it. */}
      <span className="relative">{loading && loadingLabel ? loadingLabel : children}</span>
      {!loading && <span className="relative flex items-center">{iconEnd}</span>}
    </button>
  );
}
