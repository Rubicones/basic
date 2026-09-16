"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/i18n/config";
import { FORMATS, type Format } from "@/lib/catalog/products";
import { env } from "@/lib/env";

export type SaveState = { error?: string; note?: string };
/** In demo mode nothing is written — the console is being shown, not used. */
const DEMO_RESULT = "Demo mode: nothing was saved.";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Save is three statements, not one, and the order is the point.
 *
 * The database refuses to publish a product that has no translation in the default
 * locale, and that check is deferred only to the end of *its own* transaction —
 * which, over the REST API, is one statement. So the product is written as a draft
 * first, its translations second, and only then is it allowed to go live. If
 * anything fails on the way, what is left behind is a draft: the safe direction.
 */
export async function saveProduct(_previous: SaveState, formData: FormData): Promise<SaveState> {
  if (env.consoleDemo) return { note: DEMO_RESULT };

  const original = String(formData.get("original_slug") ?? "");
  const slug = String(formData.get("slug") ?? "").trim();

  if (!SLUG.test(slug)) {
    return { error: "The slug may only contain lowercase letters, digits and single hyphens." };
  }

  const price = Number(formData.get("price_rsd"));
  if (!Number.isInteger(price) || price < 0) {
    return { error: "The price must be a whole number of dinars." };
  }

  const names = new Map<Locale, string>();
  const notes = new Map<Locale, string>();
  for (const locale of LOCALES) {
    names.set(locale, String(formData.get(`name_${locale}`) ?? "").trim());
    notes.set(locale, String(formData.get(`note_${locale}`) ?? "").trim());
  }

  // Checked before writing rather than left to the trigger, so the message names
  // the language instead of quoting a constraint.
  if (!names.get(DEFAULT_LOCALE)) {
    return {
      error: `A product needs its ${DEFAULT_LOCALE.toUpperCase()} name — it is the fallback every other language falls back to.`,
    };
  }

  const formats = FORMATS.filter((format) =>
    formData.getAll("formats").includes(format),
  ) as Format[];
  const publish = formData.get("is_published") === "on";

  const supabase = await createClient();

  const draft = {
    slug,
    price_rsd: price,
    price_is_placeholder: formData.get("price_is_placeholder") === "on",
    has_whole: formData.get("has_whole") === "on",
    whole_multiplier: Number(formData.get("whole_multiplier")) || 6,
    formats,
    photo_path: String(formData.get("photo_path") ?? "") || null,
    photo_blur: String(formData.get("photo_blur") ?? "") || null,
    photo_is_placeholder: formData.get("photo_is_placeholder") === "on",
    position: Number(formData.get("position")) || 0,
    is_published: false,
  };

  const { data: saved, error: saveError } = original
    ? await supabase.from("products").update(draft).eq("slug", original).select("id").single()
    : await supabase.from("products").insert(draft).select("id").single();

  if (saveError || !saved) {
    return { error: message(saveError?.message ?? "The product could not be saved.") };
  }

  const translations = LOCALES.filter((locale) => names.get(locale)).map((locale) => ({
    product_id: saved.id,
    locale,
    name: names.get(locale) ?? "",
    note: notes.get(locale) ?? "",
  }));

  const { error: textError } = await supabase
    .from("product_translations")
    .upsert(translations, { onConflict: "product_id,locale" });

  if (textError) return { error: message(textError.message) };

  // A language that was emptied is a translation that should stop existing, not an
  // empty string the site would render as a blank name.
  const kept = translations.map((row) => row.locale);
  const dropped = LOCALES.filter((locale) => !kept.includes(locale));
  if (dropped.length > 0) {
    await supabase
      .from("product_translations")
      .delete()
      .eq("product_id", saved.id)
      .in("locale", dropped);
  }

  if (publish) {
    const { error: publishError } = await supabase
      .from("products")
      .update({ is_published: true })
      .eq("id", saved.id);
    if (publishError) return { error: message(publishError.message) };
  }

  revalidatePath("/admin/products");
  redirect(`/admin/products/${slug}`);
}

export async function deleteProduct(formData: FormData): Promise<void> {
  if (env.consoleDemo) return;

  const slug = String(formData.get("slug") ?? "");
  const supabase = await createClient();
  // The photograph in storage is deliberately left alone: a mis-click that deletes
  // a product should not also destroy the only copy of its photo.
  await supabase.from("products").delete().eq("slug", slug);
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

/** Turns the two constraint violations a person can actually cause into sentences. */
function message(raw: string): string {
  if (raw.includes("products_slug_key")) return "Another product already uses that slug.";
  if (raw.includes("cannot be published")) {
    return "This product cannot go live without its default-language name.";
  }
  return raw;
}
