"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { revalidateSite } from "@/lib/admin/revalidate";
import { ImportError, readSheet } from "@/lib/import/xlsx";
import { MAX_ROWS, parseProducts, type ImportIssue } from "@/lib/import/products";

/**
 * The first load.
 *
 * Nothing is written until every row is readable. A half-imported price list is
 * worse than a refused one: the owner cannot tell which half, and the fix is to
 * work out what already exists before trying again. So the file is parsed and
 * checked end to end, and a single unreadable row sends the whole thing back with
 * the row number the person can see in their own spreadsheet.
 *
 * Rows are matched by slug, so re-importing a corrected file updates what is
 * there instead of doubling it — which is also what makes "export, fix, import"
 * a way of working rather than a one-time trick.
 */

export type ImportState = {
  error?: string;
  issues?: ImportIssue[];
  note?: string;
  created?: number;
  updated?: number;
};

const MAX_BYTES = 4 * 1024 * 1024;

const MESSAGES: Record<string, string> = {
  not_a_spreadsheet: "That file is not a spreadsheet — export it as .xlsx or CSV and try again.",
  no_sheet: "The workbook has no sheets in it.",
  old_xls:
    "That is the old .xls format. Open it and save as .xlsx (or CSV) — Excel, Numbers and LibreOffice all offer both.",
};

export async function importProducts(
  _previous: ImportState,
  formData: FormData,
): Promise<ImportState> {
  if (env.consoleDemo) return { note: "Demo mode: the file was read but nothing was saved." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file first." };
  if (file.size > MAX_BYTES) {
    return {
      error: "That file is over 4 MB — a price list of this size is usually a photo album.",
    };
  }

  let rows;
  try {
    const sheet = readSheet(await file.arrayBuffer());
    const parsed = parseProducts(sheet);
    if (parsed.issues.length > 0) return { issues: parsed.issues.slice(0, 40) };
    rows = parsed.rows;
  } catch (cause) {
    if (cause instanceof ImportError) {
      return { error: MESSAGES[cause.code] ?? "That file could not be read as a spreadsheet." };
    }
    console.error("[import] could not read the file", cause);
    return { error: "The file could not be read." };
  }

  if (rows.length === 0) return { error: "There are no products in that file." };
  if (rows.length > MAX_ROWS) return { error: `More than ${MAX_ROWS} rows in one file.` };

  const supabase = await createClient();
  const slugs = rows.map((row) => row.slug);

  const { data: existing, error: existingError } = await supabase
    .from("products")
    .select("slug")
    .in("slug", slugs);
  if (existingError) return { error: existingError.message };

  const known = new Set((existing ?? []).map((row: { slug: string }) => row.slug));

  // Drafts first, translations second, publication last — the same order a single
  // save uses, and for the same reason: the default-language name has to be in
  // place before a row is allowed to go live.
  const common = (row: (typeof rows)[number], index: number) => ({
    slug: row.slug,
    price_rsd: row.price,
    has_whole: row.wholePrice !== null,
    whole_price_rsd: row.wholePrice,
    tag: row.tag,
    formats: row.formats,
    weight_g: row.weightG,
    kcal: row.kcal,
    protein_g: row.protein,
    fat_g: row.fat,
    carbs_g: row.carbs,
    position: row.position ?? index,
    is_published: false,
  });

  /*
   * Two batches, because an empty photo cell means "leave the photo alone", not
   * "remove it". Photographs are uploaded in the console, and the template says
   * to leave the column empty — so a corrected price list re-imported over the
   * catalogue must not wipe every photo that was uploaded since. A bulk upsert
   * cannot omit a column for some rows only: a key missing from one object is
   * sent as null for that row. So rows that name a photo set it (and drop the
   * old blur, which belongs to the old picture), and rows that do not never
   * mention the photo columns at all.
   */
  const withPhoto = rows.flatMap((row, index) =>
    row.photo
      ? [
          {
            ...common(row, index),
            photo_path: row.photo,
            photo_blur: null,
            photo_is_placeholder: false,
          },
        ]
      : [],
  );
  const withoutPhoto = rows.flatMap((row, index) => (row.photo ? [] : [common(row, index)]));

  const saved: { id: string; slug: string }[] = [];
  let saveError: { message: string } | null = null;

  for (const batch of [withPhoto, withoutPhoto]) {
    if (batch.length === 0) continue;
    const { data, error } = await supabase
      .from("products")
      .upsert(batch, { onConflict: "slug" })
      .select("id, slug");
    if (error) {
      saveError = error;
      break;
    }
    saved.push(...((data ?? []) as { id: string; slug: string }[]));
  }

  if (saveError) return { error: saveError.message };

  const idBySlug = new Map(saved.map((row) => [row.slug, row.id]));

  const translations = rows.flatMap((row) =>
    Object.entries(row.text).map(([locale, text]) => ({
      product_id: idBySlug.get(row.slug),
      locale,
      name: text.name,
      note: text.note,
    })),
  );

  const { error: textError } = await supabase
    .from("product_translations")
    .upsert(translations, { onConflict: "product_id,locale" });
  if (textError) return { error: textError.message };

  const publish = rows
    .filter((row) => row.published)
    .map((row) => idBySlug.get(row.slug))
    .filter((id): id is string => Boolean(id));

  if (publish.length > 0) {
    const { error: publishError } = await supabase
      .from("products")
      .update({ is_published: true })
      .in("id", publish);
    if (publishError) return { error: publishError.message };
  }

  revalidatePath("/admin/products");
  revalidateSite();

  return {
    created: rows.filter((row) => !known.has(row.slug)).length,
    updated: rows.filter((row) => known.has(row.slug)).length,
  };
}
