"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/i18n/config";
import { FORMATS, type Format } from "@/lib/catalog/products";
import { env } from "@/lib/env";
import { revalidateSite } from "@/lib/admin/revalidate";
import { TAG_MAX } from "./limits";

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

  // The toggle and the whole-cake price are one fact: offering "whole" with no
  // figure behind it puts a card on the site with nothing to show for it. The
  // table checks the same thing; a message that names the field beats a quoted
  // constraint.
  const hasWhole = formData.get("has_whole") === "on";
  const wholeRaw = String(formData.get("whole_price_rsd") ?? "").trim();
  const wholePrice = wholeRaw === "" ? null : Number(wholeRaw);

  if (wholePrice !== null && (!Number.isInteger(wholePrice) || wholePrice < 0)) {
    return { error: "The whole-cake price must be a whole number of dinars." };
  }
  if (hasWhole && wholePrice === null) {
    return { error: "A product that offers the whole cake needs a price for it." };
  }

  // One language, as typed: the tag is not translated, and an absent one is null
  // rather than "", so "has a tag" is one test on the card and not two.
  const tag = String(formData.get("tag") ?? "").trim();
  if (tag.length > TAG_MAX) {
    return { error: `The corner tag has to fit in ${TAG_MAX} characters.` };
  }

  // Weight and the declaration. Four macros or none: the site shows the panel
  // only when it is whole, and a panel with a blank in it reads as a measured
  // zero — which is a claim about food, not a missing field.
  const weight = optionalNumber(formData.get("weight_g"));
  const macros = {
    kcal: optionalNumber(formData.get("kcal")),
    protein_g: optionalNumber(formData.get("protein_g")),
    fat_g: optionalNumber(formData.get("fat_g")),
    carbs_g: optionalNumber(formData.get("carbs_g")),
  };

  if (weight === false || Object.values(macros).includes(false)) {
    return { error: "Weight and the declaration have to be numbers, and none of them negative." };
  }

  const given = Object.values(macros).filter((value) => value !== null).length;
  if (given > 0 && given < 4) {
    return {
      error:
        "A declaration needs all four figures — energy, protein, fat and carbohydrate — or none of them.",
    };
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
    has_whole: hasWhole,
    // Kept even when the toggle is off, so turning it back on does not ask for a
    // number the owner already typed once.
    whole_price_rsd: wholePrice,
    tag: tag || null,
    weight_g: weight as number | null,
    kcal: macros.kcal as number | null,
    protein_g: macros.protein_g as number | null,
    fat_g: macros.fat_g as number | null,
    carbs_g: macros.carbs_g as number | null,
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
  revalidateSite();
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
  revalidateSite();
  redirect("/admin/products");
}

/**
 * An empty numeric field is a fact that is not known, not a zero.
 *
 * `false` is the third answer — "something was typed and it was not a number" —
 * because `null` already means "left blank" and the two must not be confused.
 */
function optionalNumber(raw: FormDataEntryValue | null): number | null | false {
  const value = String(raw ?? "").trim();
  if (value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : false;
}

/** Turns the two constraint violations a person can actually cause into sentences. */
function message(raw: string): string {
  if (raw.includes("products_slug_key")) return "Another product already uses that slug.";
  if (raw.includes("cannot be published")) {
    return "This product cannot go live without its default-language name.";
  }
  return raw;
}
