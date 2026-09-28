"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "./cx";
import { Field, fieldAria } from "./field";

/**
 * A one-time code, one cell per digit.
 *
 * The cells are a picture. The control is one ordinary `<input>` lying invisibly
 * on top of them, and that is the whole design: a row of six separate inputs has
 * to re-implement paste, backspace across boxes, the keyboard's code suggestion
 * and a screen reader's idea of "one field", and each of those is where such
 * forms break. One input gets all of them from the browser:
 *
 *   · paste "123 456" or "123456" — non-digits are dropped, the rest fills in
 *   · `autocomplete="one-time-code"` — iOS and Android offer the code from Mail
 *     or Messages above the keyboard, and one tap fills every cell
 *   · a screen reader hears one labelled text field, not six unlabelled ones
 *
 * The caret always sits at the end, so the cell that looks active is the one
 * the next digit goes into, and backspace always takes the last one.
 */

export type CodeInputProps = {
  name: string;
  label: string;
  length: number;
  value: string;
  onChange: (value: string) => void;
  /** Called once when the last digit lands, with the whole code. */
  onComplete?: (value: string) => void;
  help?: string;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  /**
   * Replays the shake and puts focus back in the field. Pass a number that grows
   * with every rejected code; 0 means "not rejected yet".
   */
  shake?: number;
};

export function CodeInput({
  name,
  label,
  length,
  value,
  onChange,
  onComplete,
  help,
  error,
  disabled,
  autoFocus,
  shake = 0,
}: CodeInputProps) {
  const input = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  // Focus on arrival, and again after a rejected code — the field was just
  // emptied, and the next thing anyone does is type the code again.
  useEffect(() => {
    if (autoFocus || shake > 0) input.current?.focus();
  }, [autoFocus, shake]);

  const active = Math.min(value.length, length - 1);
  const cells = Array.from({ length }, (_, i) => i);

  return (
    <Field name={name} label={label} help={help} error={error}>
      <div className="relative">
        <div
          key={shake}
          aria-hidden="true"
          className={cx("flex gap-1.5 sm:gap-2.5", shake > 0 && "code-shake")}
        >
          {cells.map((i) => {
            const digit = value[i];
            const current = focused && !disabled && i === active;

            return (
              <div
                key={i}
                className={cx(
                  "grid h-16 min-w-0 flex-1 place-items-center rounded-control border transition-surface",
                  disabled ? "bg-surface-sunken" : "bg-surface-raised",
                  error
                    ? "border-danger"
                    : current
                      ? "border-brand shadow-soft"
                      : digit
                        ? "border-line-control"
                        : "border-line",
                )}
              >
                {digit ? (
                  // Keyed by the digit, so each new one slides in rather than
                  // appearing — the same motion as every other changing value.
                  <span
                    key={digit}
                    className={cx(
                      "font-display text-display-sm value-slide tabular-nums",
                      disabled ? "text-content-secondary" : "text-content-primary",
                    )}
                  >
                    {digit}
                  </span>
                ) : current ? (
                  <span className="code-caret bg-brand h-7 w-0.5 rounded-pill" />
                ) : null}
              </div>
            );
          })}
        </div>

        <input
          ref={input}
          {...fieldAria(name, { help, error })}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern={`\\d{${length}}`}
          maxLength={length}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          // Password managers otherwise hang their badge over the last cell.
          data-1p-ignore=""
          data-lpignore="true"
          data-bwignore=""
          value={value}
          disabled={disabled}
          onChange={(event) => {
            const next = event.target.value.replace(/\D/g, "").slice(0, length);
            onChange(next);
            if (next.length === length && next !== value) onComplete?.(next);
          }}
          onFocus={(event) => {
            setFocused(true);
            const end = event.currentTarget.value.length;
            event.currentTarget.setSelectionRange(end, end);
          }}
          onBlur={() => setFocused(false)}
          // Clicking a middle cell would put the caret there; the model is
          // "type at the end, delete from the end", so it goes back.
          onSelect={(event) => {
            const field = event.currentTarget;
            const end = field.value.length;
            if (field.selectionStart !== end || field.selectionEnd !== end) {
              field.setSelectionRange(end, end);
            }
          }}
          /* Present and focusable, but unseen: transparent rather than
             `opacity-0`, which some mobile browsers treat as "not really there"
             and then withhold the code suggestion from. 16px text so iOS does
             not zoom the page on focus. The active cell is the focus indicator. */
          className={cx(
            "absolute inset-0 size-full cursor-text rounded-control border-0 bg-transparent",
            "text-body text-transparent caret-transparent selection:bg-transparent",
            "focus-visible:outline-none disabled:cursor-not-allowed",
          )}
        />
      </div>
    </Field>
  );
}
