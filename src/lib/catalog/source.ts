import "server-only";
import { hasDatabase, publicClient } from "@/lib/supabase/public";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/i18n/config";
import { FORMATS, PRODUCTS, type Format, type Nutrition, type Product } from "./products";
import { photoFor, photoFromStorage } from "./photos";

/**
 * Where the catalogue comes from.
 *
 * One function, exactly as the fixture's own comment promised: the components
 * take `Product[]` and do not know whether it was typed into a file or written in
 * the console ten seconds ago.
 *
 * With no Supabase configured the fixture is the answer — that is what keeps a
 * fresh clone running, and the design reviewable, without a database behind it.
 * With one configured, the database is the answer even when it is empty: an empty
 * catalogue is a true statement about a shop that has not added anything yet, and
 * quietly showing eighteen fixture desserts instead would be a lie told at the
 * worst possible moment.
 */

type TranslationRow = { locale: string; name: string; note: string };

type ProductRow = {
  slug: string;
  price_rsd: number;
  has_whole: boolean;
  whole_price_rsd: number | null;
  tag: string | null;
  formats: string[] | null;
  photo_path: string | null;
  photo_blur: string | null;
  photo_is_placeholder: boolean;
  weight_g: number | null;
  kcal: number | null;
  protein_g: number | string | null;
  fat_g: number | string | null;
  carbs_g: number | string | null;
  product_translations: TranslationRow[];
};

const SELECT =
  "slug, price_rsd, has_whole, whole_price_rsd, tag, formats, photo_path, photo_blur," +
  " photo_is_placeholder, weight_g, kcal, protein_g, fat_g, carbs_g," +
  " product_translations(locale, name, note)";

export async function getCatalog(): Promise<Product[]> {
  if (!hasDatabase()) {
    return PRODUCTS.map((product, index) => ({
      ...product,
      photo: photoFor(product.slug, index),
    }));
  }

  const supabase = publicClient();
  const { data, error } = await supabase
    .from("products")
    .select(SELECT)
    .eq("is_published", true)
    .order("position");

  // Loud rather than silently thin: a catalogue that failed to load is not a
  // catalogue with nothing in it, and the two must not look the same.
  if (error) throw new Error(`The catalogue could not be read: ${error.message}`);

  return ((data ?? []) as unknown as ProductRow[]).map(toProduct);
}

function toProduct(row: ProductRow, index: number): Product {
  const text = (locale: Locale) =>
    row.product_translations.find((t) => t.locale === locale) ??
    row.product_translations.find((t) => t.locale === DEFAULT_LOCALE);

  const name = {} as Record<Locale, string>;
  const note = {} as Record<Locale, string>;
  for (const locale of LOCALES) {
    name[locale] = text(locale)?.name ?? row.slug;
    note[locale] = text(locale)?.note ?? "";
  }

  return {
    slug: row.slug,
    name,
    note,
    formats: (row.formats ?? []).filter((f): f is Format =>
      (FORMATS as readonly string[]).includes(f),
    ),
    price: row.price_rsd,
    wholePrice: row.has_whole ? row.whole_price_rsd : null,
    tag: row.tag,
    photoIsPlaceholder: row.photo_is_placeholder,
    photo: photoFromStorage(row.photo_path, row.photo_blur, index),
    weightG: row.weight_g,
    nutrition: nutritionOf(row),
  };
}

/**
 * All four figures or none.
 *
 * A declaration with three of them is not a shorter declaration, it is a wrong
 * one — so a product that has not been measured shows no panel rather than a
 * panel with a blank in it.
 */
function nutritionOf(row: ProductRow): Nutrition | null {
  const kcal = row.kcal;
  const protein = num(row.protein_g);
  const fat = num(row.fat_g);
  const carbs = num(row.carbs_g);

  if (kcal === null || protein === null || fat === null || carbs === null) return null;
  return { kcal, protein, fat, carbs };
}

/** `numeric` comes back as a string over PostgREST — it does not fit a float. */
function num(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
