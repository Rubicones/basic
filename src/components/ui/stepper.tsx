import type { ReactNode } from "react";
import { cx } from "./cx";
import { IconMinus, IconPlus } from "./icon";

/**
 * A quantity control.
 *
 * It was written twice — once inside the product card, once inside the order
 * panel — before it moved here, which is the usual reason a thing belongs in the
 * kit. The pill is 44 px tall; the two buttons are 36 px, clearing 2.5.8's 24 px
 * with room, and sit inside the pill rather than floating beside it so the pair
 * reads as one control.
 *
 * The value is an `<output>`: it has an implicit `status` role, so a change is
 * announced without a second live region wrapped around the row.
 */

export type StepperProps = {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementLabel: string;
  incrementLabel: string;
  /** Names the number itself, e.g. "Quantity: Medovik". */
  valueLabel: string;
  min?: number;
};

export function Stepper({
  value,
  onDecrement,
  onIncrement,
  decrementLabel,
  incrementLabel,
  valueLabel,
  min = 0,
}: StepperProps) {
  return (
    <div className="border-line-control flex h-11 shrink-0 items-center gap-1 rounded-pill border px-1.5">
      <StepperButton onClick={onDecrement} disabled={value <= min} label={decrementLabel}>
        <IconMinus size={16} />
      </StepperButton>
      <output
        aria-label={valueLabel}
        className="font-display w-6 text-center text-body-sm leading-none font-bold tabular-nums"
      >
        {value}
      </output>
      <StepperButton onClick={onIncrement} label={incrementLabel}>
        <IconPlus size={16} />
      </StepperButton>
    </div>
  );
}

function StepperButton({
  children,
  onClick,
  disabled,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cx(
        "grid size-9 place-items-center rounded-pill transition-surface",
        "hover:bg-surface-brand hover:text-brand",
        "disabled:text-content-tertiary disabled:cursor-not-allowed disabled:hover:bg-transparent",
      )}
    >
      {children}
    </button>
  );
}
