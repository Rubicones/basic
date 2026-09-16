import type { TextareaHTMLAttributes } from "react";
import { cx } from "./cx";
import { Field, controlSurface, fieldAria } from "./field";

export type TextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "className" | "style" | "id" | "name"
> & {
  name: string;
  label: string;
  help?: string;
  error?: string;
  wide?: boolean;
};

export function Textarea({ name, label, help, error, wide, rows = 4, ...rest }: TextareaProps) {
  return (
    <Field name={name} label={label} help={help} error={error} required={rest.required} wide={wide}>
      <textarea
        {...rest}
        {...fieldAria(name, { help, error })}
        rows={rows}
        /* No resize handle: a resizable textarea inside a grid drags the layout
           with it. The row count is the affordance. */
        className={cx(controlSurface, "resize-none py-3 leading-relaxed")}
      />
    </Field>
  );
}
