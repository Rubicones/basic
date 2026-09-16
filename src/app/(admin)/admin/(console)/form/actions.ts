"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/i18n/config";
import { env } from "@/lib/env";

export type FieldState = { error?: string; savedKey?: string; note?: string };
/** In demo mode nothing is written — the console is being shown, not used. */
const DEMO_RESULT = "Demo mode: nothing was saved.";

const KEY = /^[a-z][a-z0-9_]*$/;

/** The four columns the shape constraint arbitrates between. */
type FieldShape = {
  input_type: string | null;
  options_source: string | null;
  rows: number | null;
  autocomplete: string | null;
};

/**
 * The owner edits the order form; the database refuses the shapes that would
 * break it. `order_fields_shape` is what stops a select with a row count or an
 * input with no type, so the console does not have to re-implement that rule —
 * it only has to send a shape that can satisfy it.
 */
export async function saveField(_previous: FieldState, formData: FormData): Promise<FieldState> {
  if (env.consoleDemo) return { note: DEMO_RESULT };

  const id = String(formData.get("id") ?? "");
  const key = String(formData.get("key") ?? "").trim();

  if (!KEY.test(key)) {
    return { error: "A key is lowercase letters, digits and underscores, starting with a letter." };
  }

  const control = String(formData.get("control") ?? "input");
  const labels = new Map<Locale, string>();
  for (const locale of LOCALES) {
    labels.set(locale, String(formData.get(`label_${locale}`) ?? "").trim());
  }

  const enable = formData.get("is_enabled") === "on";
  if (enable && !labels.get(DEFAULT_LOCALE)) {
    return {
      error: `A field cannot be shown without its ${DEFAULT_LOCALE.toUpperCase()} label — it is the fallback.`,
    };
  }

  // A hand-written choice list is written once per language and matched by
  // position, so the languages have to agree on how many options there are.
  const optionLists = new Map<Locale, string[]>();
  for (const locale of LOCALES) {
    optionLists.set(locale, parseOptions(String(formData.get(`options_${locale}`) ?? "")));
  }

  const optionsSource = String(formData.get("options_source") ?? "cities");
  if (control === "select" && optionsSource === "list") {
    const sizes = LOCALES.map((locale) => optionLists.get(locale)?.length ?? 0).filter(
      (size) => size > 0,
    );
    if (sizes.length === 0) {
      return { error: "A hand-written choice needs at least one option." };
    }
    if (new Set(sizes).size > 1) {
      return {
        error:
          "Every language needs the same number of options — the answer stored in an order is matched by position.",
      };
    }
  }

  const shape: FieldShape =
    control === "input"
      ? {
          input_type: String(formData.get("input_type") ?? "text"),
          options_source: null,
          rows: null,
          autocomplete: String(formData.get("autocomplete") ?? "") || null,
        }
      : control === "select"
        ? {
            input_type: null,
            options_source: optionsSource,
            rows: null,
            autocomplete: null,
          }
        : {
            input_type: null,
            options_source: null,
            rows: Number(formData.get("rows")) || 3,
            autocomplete: null,
          };

  const supabase = await createClient();

  // Disabled first, for the same reason products are saved as drafts first: the
  // "must have a default label" check runs per statement, so the labels have to be
  // in place before the field is allowed to appear.
  const row = {
    key,
    control,
    ...shape,
    is_required: formData.get("is_required") === "on",
    is_wide: formData.get("is_wide") === "on",
    is_enabled: false,
    position: Number(formData.get("position")) || 0,
  };

  const { data: saved, error: saveError } = id
    ? await supabase.from("order_fields").update(row).eq("id", id).select("id").single()
    : await supabase.from("order_fields").insert(row).select("id").single();

  if (saveError || !saved) {
    return {
      error: saveError?.message.includes("order_fields_key_key")
        ? "Another field already uses that key."
        : (saveError?.message ?? "The field could not be saved."),
    };
  }

  const texts = LOCALES.filter((locale) => labels.get(locale)).map((locale) => ({
    field_id: saved.id,
    locale,
    label: labels.get(locale) ?? "",
    placeholder: String(formData.get(`placeholder_${locale}`) ?? "").trim(),
    help: String(formData.get(`help_${locale}`) ?? "").trim(),
    options:
      control === "select" && optionsSource === "list" ? (optionLists.get(locale) ?? []) : [],
  }));

  const { error: textError } = await supabase
    .from("order_field_translations")
    .upsert(texts, { onConflict: "field_id,locale" });
  if (textError) return { error: textError.message };

  if (enable) {
    const { error: enableError } = await supabase
      .from("order_fields")
      .update({ is_enabled: true })
      .eq("id", saved.id);
    if (enableError) return { error: enableError.message };
  }

  revalidatePath("/admin/form");
  return { savedKey: key };
}

export async function deleteField(formData: FormData): Promise<void> {
  if (env.consoleDemo) return;

  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  await supabase.from("order_fields").delete().eq("id", id);
  revalidatePath("/admin/form");
}

/** Reordering is a swap, so two fields can never share a position. */
export async function moveField(formData: FormData): Promise<void> {
  if (env.consoleDemo) return;

  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "up");

  const supabase = await createClient();
  const { data: fields } = await supabase
    .from("order_fields")
    .select("id, position")
    .order("position");
  if (!fields) return;

  const index = fields.findIndex((field: { id: string }) => field.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= fields.length) return;

  const a = fields[index] as { id: string; position: number };
  const b = fields[target] as { id: string; position: number };

  await supabase.from("order_fields").update({ position: b.position }).eq("id", a.id);
  await supabase.from("order_fields").update({ position: a.position }).eq("id", b.id);

  revalidatePath("/admin/form");
}

/** One option per line. Blank lines are how a list gets an invisible empty choice. */
function parseOptions(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
