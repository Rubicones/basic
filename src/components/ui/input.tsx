import type { InputHTMLAttributes } from "react";
import { cx } from "./cx";
import { Field, controlSurface, fieldAria } from "./field";

/**
 * The control owns its label, help and error.
 *
 * The first cut had `<Field error="…">` wrapping a bare `<Input>`, and the error
 * was rendered by one and `aria-invalid` set by the other — so a field could show
 * a red sentence while announcing itself as valid, which is exactly what happened
 * the first time this page was measured. One prop, one source of truth.
 */

export type InputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className" | "style" | "id" | "name" | "size"
> & {
  name: string;
  label: string;
  help?: string;
  error?: string;
  /** Spans both columns of a form grid. */
  wide?: boolean;
  /** Matches Button, so a control and a button sit level on one row. */
  size?: "md" | "lg";
};

export function Input({ name, label, help, error, wide, size = "md", ...rest }: InputProps) {
  return (
    <Field name={name} label={label} help={help} error={error} required={rest.required} wide={wide}>
      <input
        {...rest}
        {...fieldAria(name, { help, error })}
        className={cx(controlSurface, size === "lg" ? "h-13" : "h-11")}
      />
    </Field>
  );
}
