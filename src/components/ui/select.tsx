import type { SelectHTMLAttributes } from "react";
import { cx } from "./cx";
import { Field, controlSurface, fieldAria } from "./field";
import { IconChevronDown } from "./icon";

export type SelectOption = { value: string; label: string };

export type SelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "className" | "style" | "id" | "name" | "children"
> & {
  name: string;
  label: string;
  options: SelectOption[];
  /** Rendered as a disabled first option, selected by default. */
  placeholder?: string;
  help?: string;
  error?: string;
  wide?: boolean;
};

/**
 * A native `<select>`. It gets the platform's keyboard handling, the phone's wheel
 * picker and the screen reader's list semantics for free — none of which a div
 * rebuild matches. The only custom part is the chevron, because the native one
 * cannot be recolored.
 */
export function Select({
  name,
  label,
  options,
  placeholder,
  help,
  error,
  wide,
  ...rest
}: SelectProps) {
  return (
    <Field name={name} label={label} help={help} error={error} required={rest.required} wide={wide}>
      <div className="relative">
        <select
          {...rest}
          {...fieldAria(name, { help, error })}
          defaultValue={rest.defaultValue ?? (placeholder ? "" : undefined)}
          className={cx(controlSurface, "h-11 cursor-pointer appearance-none pr-11")}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="text-content-secondary pointer-events-none absolute inset-y-0 right-4 flex items-center">
          <IconChevronDown size={16} />
        </span>
      </div>
    </Field>
  );
}
