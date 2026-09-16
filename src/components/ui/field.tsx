import type { ReactNode } from "react";
import { cx } from "./cx";
import { IconAlert } from "./icon";

/**
 * The label / help / error scaffolding every control shares.
 *
 * Input, Textarea and Select render this themselves — it is exported only for a
 * control the kit does not have, such as a quantity stepper. Wrapping a standard
 * control in it by hand is how the error text and `aria-invalid` come apart.
 *
 * Ids are derived from `name` rather than `useId` so this works in a server
 * component — a form that renders on the server is the whole point of the stack.
 *
 * The error is wired through `aria-describedby` and `aria-invalid` by the control,
 * and it is never signalled by color alone: there is an icon and a sentence.
 */

export type FieldProps = {
  name: string;
  label: string;
  children: ReactNode;
  help?: string | undefined;
  error?: string | undefined;
  required?: boolean | undefined;
  /** Full width inside a two-column form grid. */
  wide?: boolean | undefined;
};

export function fieldIds(name: string) {
  return {
    control: `f-${name}`,
    help: `f-${name}-help`,
    error: `f-${name}-error`,
  };
}

/** What a control needs to be wired to its label, help and error. */
export function fieldAria(
  name: string,
  { help, error }: { help?: string | undefined; error?: string | undefined },
) {
  const ids = fieldIds(name);
  const describedBy = [help ? ids.help : null, error ? ids.error : null].filter(Boolean).join(" ");
  return {
    id: ids.control,
    name,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy || undefined,
  } as const;
}

export function Field({ name, label, children, help, error, required, wide }: FieldProps) {
  const ids = fieldIds(name);

  return (
    <div className={cx("flex min-w-0 flex-col gap-2", wide && "sm:col-span-2")}>
      <label htmlFor={ids.control} className="text-micro text-brand uppercase">
        {label}
        {required && (
          <span className="text-danger" aria-hidden="true">
            {" *"}
          </span>
        )}
      </label>

      {children}

      {help && !error && (
        <p id={ids.help} className="text-caption text-content-secondary">
          {help}
        </p>
      )}

      {error && (
        <p id={ids.error} className="text-caption text-danger flex items-start gap-1.5">
          <span className="mt-0.5 shrink-0">
            <IconAlert size={16} />
          </span>
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Shared control surface. `--color-line-control` is 3.05:1 against the page, so the
 * boundary satisfies 1.4.11 — the reference's hairline was 1.27:1.
 *
 * Focus on these controls is a brand-coloured border rather than the global ring —
 * see the note on the focus line below. Every other control keeps the ring.
 */
export const controlSurface = cx(
  "w-full rounded-control border bg-surface-raised px-4 text-body-sm",
  "border-line-control text-content-primary",
  /* The reference used muted-foreground here, not foreground/60 — which is both
     more faithful and the only one of the two that clears AA (4.56 vs 3.90). */
  "placeholder:text-content-secondary",
  "transition-surface",
  /* No hover treatment: the reference's field reacts to focus and nothing else, and
     a hover tint reads as "focused" on a pointer device without meaning it. */
  /* Focus on a text control is the reference's: the border takes the brand colour
     and there is no ring. This is the one place the global :focus-visible outline
     is turned off, on Dmitry's call — the indicator is weaker than a ring, and it
     is the reference's look. Buttons, links and the stepper keep the ring. */
  "focus-visible:border-brand focus-visible:outline-none",
  // Same reasoning as the button: an explicit disabled surface, so the contrast
  // of the value inside a locked field is a number we control.
  "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-content-secondary",
  "disabled:border-line",
  "invalid:border-danger invalid:focus-visible:border-danger",
);
