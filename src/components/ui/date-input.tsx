"use client";

import { useRef, useState } from "react";
import { cx } from "./cx";
import { Field, controlSurface, fieldAria } from "./field";
import { IconCalendar } from "./icon";

/**
 * A date, always written dd.mm.yyyy.
 *
 * A native `<input type="date">` renders in whatever format the browser's locale
 * prefers — mm/dd/yyyy on an English Mac, yyyy-mm-dd elsewhere — and that is not
 * something the page can override. So the field is text with a mask, and the
 * native picker is kept only as the calendar behind the button: it is opened
 * with `showPicker()` and its ISO value converted on the way in. What is posted
 * is the text the customer sees.
 */

export type DateInputProps = {
  name: string;
  label: string;
  help?: string | undefined;
  error?: string | undefined;
  required?: boolean | undefined;
  wide?: boolean | undefined;
  placeholder?: string | undefined;
  /** Accessible name of the calendar button. */
  pickerLabel?: string | undefined;
};

const PATTERN = "(0[1-9]|[12][0-9]|3[01])\\.(0[1-9]|1[0-2])\\.[0-9]{4}";

/** Digits only, dots inserted as the day and month are completed. */
function mask(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}.${d.slice(2)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4)}`;
}

function isoToDisplay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : "";
}

function displayToIso(value: string): string {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
}

function todayIso(): string {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export function DateInput({
  name,
  label,
  help,
  error,
  required,
  wide,
  placeholder = "dd.mm.yyyy",
  pickerLabel = label,
}: DateInputProps) {
  const [value, setValue] = useState("");
  const picker = useRef<HTMLInputElement>(null);

  function openPicker() {
    const el = picker.current;
    if (!el) return;
    el.value = displayToIso(value);
    try {
      el.showPicker();
    } catch {
      el.focus();
      el.click();
    }
  }

  return (
    <Field name={name} label={label} help={help} error={error} required={required} wide={wide}>
      <div className="relative">
        <input
          {...fieldAria(name, { help, error })}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          pattern={PATTERN}
          maxLength={10}
          required={required}
          value={value}
          onChange={(event) => setValue(mask(event.target.value))}
          className={cx(controlSurface, "h-11 pr-12 tabular-nums")}
        />

        <button
          type="button"
          onClick={openPicker}
          aria-label={pickerLabel}
          className="text-content-secondary hover:text-brand transition-ink absolute inset-y-0 right-0 grid w-11 place-items-center"
        >
          <IconCalendar size={20} />
        </button>

        {/* The calendar only. Unnamed, so it never posts; out of the tab order
            and the accessibility tree, because the text field is the control. */}
        <input
          ref={picker}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          min={todayIso()}
          onChange={(event) => setValue(isoToDisplay(event.target.value))}
          className="pointer-events-none absolute right-0 bottom-0 size-px opacity-0"
        />
      </div>
    </Field>
  );
}
