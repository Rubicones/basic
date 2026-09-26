import "server-only";
import { hasDatabase, publicClient } from "@/lib/supabase/public";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/dictionaries";
import { ORDER_FIELDS, fieldText } from "./fields";

/**
 * The order form, as the customer sees it.
 *
 * `fields.ts` describes the seven questions the shop started with and the
 * dictionaries hold their copy, because translating a field and adding a field
 * are two different jobs. Once the console exists, adding a field is a job too —
 * and a field invented at 11pm in Belgrade has no dictionary entry and never
 * will, so its copy travels with it, in `order_field_translations`.
 *
 * Both sources resolve to the same shape. The renderer never learns which it got.
 */

export type Choice = { value: string; label: string };

export type PublicField = {
  key: string;
  required: boolean;
  /** Spans both columns of the form grid. */
  wide: boolean;
  label: string;
  placeholder: string;
  help: string;
} & (
  | { control: "input"; type: "text" | "tel" | "email" | "date"; autoComplete?: string }
  | { control: "select"; options: Choice[] }
  | { control: "textarea"; rows: number }
);

type FieldTranslationRow = {
  locale: string;
  label: string;
  placeholder: string;
  help: string;
  options: string[] | null;
};

type FieldRow = {
  key: string;
  control: "input" | "select" | "textarea";
  input_type: "text" | "tel" | "email" | "date" | null;
  options_source: string | null;
  rows: number | null;
  autocomplete: string | null;
  is_required: boolean;
  is_wide: boolean;
  order_field_translations: FieldTranslationRow[];
};

const SELECT =
  "key, control, input_type, options_source, rows, autocomplete, is_required, is_wide," +
  " order_field_translations(locale, label, placeholder, help, options)";

export async function getOrderFields(locale: Locale, t: Messages): Promise<PublicField[]> {
  if (!hasDatabase()) return fromFixture(t);

  const supabase = publicClient();
  const { data, error } = await supabase
    .from("order_fields")
    .select(SELECT)
    .eq("is_enabled", true)
    .order("position");

  if (error) throw new Error(`The order form could not be read: ${error.message}`);

  const rows = (data ?? []) as unknown as FieldRow[];
  // A form with no fields is a form nobody can be reached through, so the shipped
  // set stands in. This is not the catalogue: an empty catalogue is a fact about
  // the shop, an empty form is a configuration accident.
  if (rows.length === 0) return fromFixture(t);

  return rows.map((row) => toField(row, locale, t));
}

function toField(row: FieldRow, locale: Locale, t: Messages): PublicField {
  const text =
    row.order_field_translations.find((r) => r.locale === locale) ??
    row.order_field_translations.find((r) => r.locale === DEFAULT_LOCALE);

  const common = {
    key: row.key,
    required: row.is_required,
    wide: row.is_wide,
    label: text?.label ?? row.key,
    placeholder: text?.placeholder ?? "",
    help: text?.help ?? "",
  };

  if (row.control === "textarea") {
    return { ...common, control: "textarea", rows: row.rows ?? 3 };
  }

  if (row.control === "select") {
    return { ...common, control: "select", options: choices(row, text, t) };
  }

  return {
    ...common,
    control: "input",
    type: row.input_type ?? "text",
    ...(row.autocomplete ? { autoComplete: row.autocomplete } : {}),
  };
}

/**
 * Where a choice list comes from.
 *
 * `cities` is the delivery area, which is already a translated list on the
 * delivery section — one source, so the form and the map can never disagree about
 * where the van goes. Anything else is a list typed into the console, matched
 * across languages by position, which is why the answer stored on an order is the
 * label and not an index.
 */
function choices(row: FieldRow, text: FieldTranslationRow | undefined, t: Messages): Choice[] {
  if (row.options_source === "cities") {
    return t.delivery.cities.map((city) => ({ value: city.slug, label: city.name }));
  }
  return (text?.options ?? []).map((option) => ({ value: option, label: option }));
}

/** The seven the shop started with, with their copy from the dictionaries. */
function fromFixture(t: Messages): PublicField[] {
  return ORDER_FIELDS.map((field) => {
    const text = fieldText(t, field.key);
    const common = {
      key: field.key,
      required: field.required,
      wide: field.wide,
      label: text.label,
      placeholder: text.placeholder ?? "",
      help: text.help ?? "",
    };

    if (field.control === "textarea") {
      return { ...common, control: "textarea" as const, rows: field.rows };
    }
    if (field.control === "select") {
      return {
        ...common,
        control: "select" as const,
        options: t.delivery.cities.map((city) => ({ value: city.slug, label: city.name })),
      };
    }
    return {
      ...common,
      control: "input" as const,
      type: field.type,
      ...(field.autoComplete ? { autoComplete: field.autoComplete } : {}),
    };
  });
}
