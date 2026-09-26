import type { Locale } from "@/lib/i18n/config";
import type { Format } from "@/lib/catalog/products";

/**
 * The shapes the console reads and writes.
 *
 * Hand-written rather than generated. `supabase gen types` would need the CLI, a
 * project ref and a network round trip in the build, and would then describe the
 * whole schema when the console touches nine tables — so these are declared here
 * and the migration is the thing they have to agree with. When that stops being
 * true, generated types are the fix, not more hand-written ones.
 */

export type ProductRow = {
  id: string;
  slug: string;
  price_rsd: number;
  has_whole: boolean;
  /** RSD for the whole cake. Null wherever `has_whole` is false. */
  whole_price_rsd: number | null;
  /** The corner label on the card. One language, as typed. */
  tag: string | null;
  /** Grams, per piece — or per cake on the whole-cake rows. */
  weight_g: number | null;
  /** Per 100g. All four or none: a declaration with a gap in it is a wrong one. */
  kcal: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
  formats: Format[];
  photo_path: string | null;
  photo_blur: string | null;
  photo_is_placeholder: boolean;
  position: number;
  is_published: boolean;
};

export type TranslationRow = { locale: Locale; name: string; note: string };

export type ProductWithTranslations = ProductRow & {
  product_translations: TranslationRow[];
};

export type OrderFieldRow = {
  id: string;
  key: string;
  control: "input" | "select" | "textarea";
  input_type: "text" | "tel" | "email" | "date" | null;
  options_source: string | null;
  rows: number | null;
  autocomplete: string | null;
  is_required: boolean;
  is_wide: boolean;
  is_enabled: boolean;
  position: number;
};

export type FieldTextRow = {
  locale: Locale;
  label: string;
  placeholder: string;
  help: string;
  /** Choice labels in this language, positionally aligned across languages. */
  options: string[];
};

export type OrderFieldWithTranslations = OrderFieldRow & {
  order_field_translations: FieldTextRow[];
};

export type AdminRow = {
  user_id: string;
  email: string;
  created_at: string;
};

/** Renamed in 0009 to the shop's own words. */
export type OrderStatus = "new" | "processing" | "completed" | "canceled";

export type OrderRow = {
  id: string;
  number: number;
  created_at: string;
  status: OrderStatus;
  locale: Locale;
  total_rsd: number;
  notified_at: string | null;
  notify_error: string | null;
  notify_attempts: number;
  telegram_status: OrderStatus | null;
};

/** One device an administrator enabled push on. Keys are not selected. */
export type PushDeviceRow = {
  id: string;
  endpoint: string;
  label: string;
  created_at: string;
  last_success_at: string | null;
  last_error: string | null;
  failures: number;
};

export type OrderItemRow = {
  id: string;
  variant: "piece" | "whole";
  qty: number;
  unit_price_rsd: number;
  name_snapshot: string;
};

export type OrderAnswerRow = {
  field_key: string;
  label_snapshot: string;
  value: string;
  position: number;
};

export type OrderDetail = OrderRow & {
  order_items: OrderItemRow[];
  order_answers: OrderAnswerRow[];
};

/** Picks the row for a locale, falling back the way the site does. */
export function forLocale<T extends { locale: Locale }>(
  rows: T[],
  locale: Locale,
  fallback: Locale,
): T | undefined {
  return rows.find((row) => row.locale === locale) ?? rows.find((row) => row.locale === fallback);
}
