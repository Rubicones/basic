import type { InputHTMLAttributes } from "react";
import { cx } from "./cx";
import { IconCheck } from "./icon";

export type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className" | "style" | "id" | "name" | "type" | "children"
> & {
  name: string;
  label: string;
  help?: string;
};

/**
 * A real `<input type="checkbox">`, visually replaced but never removed from the
 * accessibility tree or the tab order: it is `sr-only` and `peer`, so focus,
 * checked and disabled all come from the input's own state.
 */
export function Checkbox({ name, label, help, disabled, ...rest }: CheckboxProps) {
  /* A checkbox group shares one `name`, so the name alone cannot identify the
     element: four "formats" boxes would have carried one id between them and every
     label would have toggled the first. The value disambiguates them. */
  const id = rest.value === undefined ? `c-${name}` : `c-${name}-${String(rest.value)}`;
  const helpId = `${id}-help`;

  return (
    <div className="flex min-w-0 gap-3">
      <input
        {...rest}
        type="checkbox"
        id={id}
        name={name}
        disabled={disabled}
        aria-describedby={help ? helpId : undefined}
        className="peer sr-only"
      />
      <label
        htmlFor={id}
        className={cx(
          "grid size-5 shrink-0 place-items-center rounded-xs border",
          "border-line-control bg-surface-raised cursor-pointer",
          "transition-surface",
          "hover:border-brand",
          "peer-checked:bg-brand peer-checked:border-brand peer-checked:text-content-on-brand",
          "peer-focus-visible:outline-focus peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2",
          "peer-disabled:cursor-not-allowed peer-disabled:border-line peer-disabled:bg-surface-sunken",
          "peer-disabled:hover:border-line peer-checked:peer-disabled:bg-content-tertiary",
          "text-transparent",
        )}
      >
        <IconCheck size={16} />
      </label>

      <div className="min-w-0">
        <label
          htmlFor={id}
          className={cx(
            "text-body-sm cursor-pointer",
            disabled ? "text-content-tertiary cursor-not-allowed" : "text-content-primary",
          )}
        >
          {label}
        </label>
        {help && (
          <p id={helpId} className="text-caption text-content-secondary mt-1">
            {help}
          </p>
        )}
      </div>
    </div>
  );
}
