"use client";

import { useActionState, useState, type ReactNode } from "react";
import {
  Button,
  Card,
  Checkbox,
  IconAlert,
  IconCheck,
  IconChevronDown,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { cx } from "@/components/ui/cx";
import { DEFAULT_LOCALE, LOCALES, LOCALE_LABEL } from "@/lib/i18n/config";
import { saveField, type FieldState } from "./actions";
import type { OrderFieldWithTranslations } from "@/lib/admin/types";

const CONTROLS = [
  { value: "input", label: "Single line" },
  { value: "select", label: "Choice" },
  { value: "textarea", label: "Paragraph" },
];

const TYPES = [
  { value: "text", label: "Text" },
  { value: "tel", label: "Phone" },
  { value: "email", label: "Email" },
  { value: "date", label: "Date" },
];

const SOURCES = [
  { value: "cities", label: "The delivery cities" },
  { value: "list", label: "A list I write here" },
];

/**
 * One field, open or shut.
 *
 * The shape inputs follow the control, because the database's `order_fields_shape`
 * constraint rejects the combinations that are hidden here — showing a row count
 * next to a "choice" would only be offering a save that cannot succeed.
 *
 * `toolbar` is where the row's own controls go. They used to sit in a column
 * beside the card, which made every row as tall as three stacked buttons whether
 * or not it had anything to say.
 */
export function FieldEditor({
  field,
  toolbar,
  defaultOpen = false,
}: {
  field: OrderFieldWithTranslations | null;
  toolbar?: ReactNode;
  defaultOpen?: boolean;
}) {
  const [state, action, pending] = useActionState<FieldState, FormData>(saveField, {});
  const [open, setOpen] = useState(defaultOpen);
  const [control, setControl] = useState(field?.control ?? "input");
  const [source, setSource] = useState(field?.options_source ?? "cities");

  const textFor = (locale: string) =>
    field?.order_field_translations.find((row) => row.locale === locale);

  const panelId = `field-${field?.id ?? "new"}`;
  const showOptions = control === "select" && source === "list";

  return (
    <Card padding="none" clip>
      <div className="flex items-center gap-3 p-4">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span
            className={cx(
              "text-content-secondary flex transition-transform duration-base ease-out-smooth",
              open && "rotate-180",
            )}
          >
            <IconChevronDown size={16} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="font-display text-body-sm block font-bold">
              {textFor(DEFAULT_LOCALE)?.label ?? field?.key ?? "New field"}
            </span>
            <span className="text-caption text-content-secondary block truncate">
              {field ? `${field.key} · ${field.control}` : "not saved yet"}
            </span>
          </span>
        </button>

        {field && !field.is_enabled && (
          <span className="bg-surface-sunken text-content-secondary text-micro shrink-0 rounded-pill px-3 py-1 uppercase">
            Hidden
          </span>
        )}

        {toolbar && <div className="flex shrink-0 items-center gap-1">{toolbar}</div>}
      </div>

      <div id={panelId} hidden={!open} className="border-line border-t p-4">
        <form action={action} className="flex flex-col gap-6">
          {field && <input type="hidden" name="id" value={field.id} />}

          {state.error && (
            <p role="alert" className="text-body-sm text-danger flex items-start gap-2 font-medium">
              <span className="mt-0.5 shrink-0">
                <IconAlert size={16} />
              </span>
              {state.error}
            </p>
          )}

          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <Input
              name="key"
              label="Key"
              defaultValue={field?.key ?? ""}
              required
              help="Identifies the answer in an order. Changing it does not rewrite past orders."
            />
            <Input
              name="position"
              type="number"
              label="Position"
              defaultValue={String(field?.position ?? 0)}
            />
            <Select
              name="control"
              label="Control"
              options={CONTROLS}
              defaultValue={control}
              onChange={(event) => setControl(event.target.value as typeof control)}
            />

            {control === "input" && (
              <Select
                name="input_type"
                label="Type"
                options={TYPES}
                defaultValue={field?.input_type ?? "text"}
              />
            )}
            {control === "select" && (
              <Select
                name="options_source"
                label="Options from"
                options={SOURCES}
                defaultValue={source}
                onChange={(event) => setSource(event.target.value)}
              />
            )}
            {control === "textarea" && (
              <Input
                name="rows"
                type="number"
                min={2}
                max={10}
                label="Rows"
                defaultValue={String(field?.rows ?? 3)}
              />
            )}
            {control === "input" && (
              <Input
                name="autocomplete"
                label="Autocomplete"
                defaultValue={field?.autocomplete ?? ""}
                help="Browser hint, e.g. organization, name, tel, email."
              />
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Checkbox
              name="is_required"
              label="Required"
              defaultChecked={field?.is_required ?? false}
            />
            <Checkbox name="is_wide" label="Full width" defaultChecked={field?.is_wide ?? false} />
            <Checkbox
              name="is_enabled"
              label="Shown on the site"
              help={`Needs its ${DEFAULT_LOCALE.toUpperCase()} label.`}
              defaultChecked={field?.is_enabled ?? true}
            />
          </div>

          {LOCALES.map((locale) => (
            <fieldset key={locale} className="border-line min-w-0 rounded-inner border p-4">
              <legend className="text-micro text-brand px-2 uppercase">
                {LOCALE_LABEL[locale]}
              </legend>
              <div className="flex flex-col gap-5">
                <Input
                  name={`label_${locale}`}
                  label="Label"
                  defaultValue={textFor(locale)?.label ?? ""}
                  required={locale === DEFAULT_LOCALE}
                />
                <Input
                  name={`placeholder_${locale}`}
                  label="Placeholder"
                  defaultValue={textFor(locale)?.placeholder ?? ""}
                />
                <Input
                  name={`help_${locale}`}
                  label="Hint"
                  defaultValue={textFor(locale)?.help ?? ""}
                />

                {showOptions && (
                  <Textarea
                    name={`options_${locale}`}
                    label="Choices"
                    rows={4}
                    defaultValue={(textFor(locale)?.options ?? []).join("\n")}
                    help="One per line, in the same order in every language — an answer is stored by position."
                  />
                )}
              </div>
            </fieldset>
          ))}

          <div className="flex items-center gap-4">
            <Button type="submit" loading={pending} loadingLabel="Saving…">
              Save field
            </Button>
            {state.note && (
              <p
                role="status"
                className="text-body-sm text-content-secondary flex items-center gap-2"
              >
                <IconCheck size={16} />
                {state.note}
              </p>
            )}
            {state.savedKey && (
              <p
                role="status"
                className="text-body-sm text-success flex items-center gap-2 font-medium"
              >
                <IconCheck size={16} />
                Saved.
              </p>
            )}
          </div>
        </form>
      </div>
    </Card>
  );
}
