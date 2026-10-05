import "server-only";
import { hasDatabase, publicClient } from "@/lib/supabase/public";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { ORDER_FIELDS, fieldText } from "@/lib/order/fields";
import { DEFAULT_PURPOSES } from "@/lib/order/governance";

/**
 * Annex 1 to the Privacy Policy: the order form's fields as they are right now,
 * read from the same table the form is rendered from. Its "as of" date is when
 * the field set last changed (the audit log), not the policy's own date.
 */

export type AnnexField = { label: string; required: boolean; purpose: string };
export type FormAnnex = { asOf: string; fields: AnnexField[]; special: AnnexField[] };

type Row = {
  is_required: boolean;
  sensitivity: "normal" | "special_category";
  order_field_translations: { locale: string; label: string; purpose: string }[];
};

export async function getFormAnnex(locale: Locale, fallbackDate: string): Promise<FormAnnex> {
  if (!hasDatabase()) return fromFixture(locale, fallbackDate);

  const supabase = publicClient();
  const [{ data, error }, { data: changedAt }] = await Promise.all([
    supabase
      .from("order_fields")
      .select("is_required, sensitivity, order_field_translations(locale, label, purpose)")
      .eq("is_enabled", true)
      .order("position"),
    supabase.rpc("order_form_changed_at"),
  ]);
  if (error) throw new Error(`Annex 1 could not be read: ${error.message}`);

  const rows = (data ?? []) as unknown as Row[];
  if (rows.length === 0) return fromFixture(locale, fallbackDate);

  const all = rows.map((row) => {
    const text =
      row.order_field_translations.find((t) => t.locale === locale && t.purpose) ??
      row.order_field_translations.find((t) => t.locale === DEFAULT_LOCALE);
    return {
      field: { label: text?.label ?? "", required: row.is_required, purpose: text?.purpose ?? "" },
      special: row.sensitivity === "special_category",
    };
  });

  return {
    asOf: typeof changedAt === "string" ? changedAt : fallbackDate,
    fields: all.filter((f) => !f.special).map((f) => f.field),
    special: all.filter((f) => f.special).map((f) => f.field),
  };
}

function fromFixture(locale: Locale, asOf: string): FormAnnex {
  const t = getDictionary(locale);
  return {
    asOf,
    fields: ORDER_FIELDS.map((field) => ({
      label: fieldText(t, field.key).label,
      required: field.required,
      purpose: DEFAULT_PURPOSES[field.key]?.[locale] ?? "",
    })),
    special: [],
  };
}
