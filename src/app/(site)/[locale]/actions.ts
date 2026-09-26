"use server";

import { hasDatabase, publicClient } from "@/lib/supabase/public";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n/config";

/**
 * Placing an order.
 *
 * The client sends what the client is entitled to know — which product, which
 * variant, how many, and what was typed into the form. It does not send a single
 * dinar: `submit_order` reprices every line from `products` and writes the order
 * itself, because there is no anon INSERT on that table and a cart the browser
 * prices is a cart the browser can discount.
 *
 * What comes back is a code, not a sentence. The database does not speak three
 * languages and should not try; the page turns this into one line of copy it
 * already has.
 */

export type SubmitInput = {
  locale: string;
  items: { slug: string; variant: "piece" | "whole"; qty: number }[];
  answers: Record<string, string>;
};

export type SubmitResult =
  { ok: true; id: string } | { ok: false; code: "empty" | "unavailable" | "rejected" | "failed" };

export async function submitOrder(input: SubmitInput): Promise<SubmitResult> {
  const locale = isLocale(input.locale) ? input.locale : DEFAULT_LOCALE;

  const items = (Array.isArray(input.items) ? input.items : [])
    .map((item) => ({
      slug: String(item?.slug ?? "").trim(),
      variant: item?.variant === "whole" ? ("whole" as const) : ("piece" as const),
      qty: Math.trunc(Number(item?.qty)),
    }))
    .filter((item) => item.slug !== "" && Number.isFinite(item.qty) && item.qty > 0);

  if (items.length === 0) return { ok: false, code: "empty" };

  // Whatever the form posted, trimmed and bounded. The function decides which of
  // these it actually wants — the enabled fields are its business, not ours.
  const answers: Record<string, string> = {};
  for (const [key, value] of Object.entries(input.answers ?? {})) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) answers[key] = trimmed.slice(0, 1000);
  }

  if (!hasDatabase()) return { ok: false, code: "unavailable" };

  const supabase = publicClient();
  const { data, error } = await supabase.rpc("submit_order", {
    p_locale: locale,
    p_items: items,
    p_answers: answers,
  });

  if (error) {
    // `check_violation` is how the function says "this order is not valid" —
    // anything else is the database having a bad day, and the two deserve
    // different logs even though the customer sees one sentence.
    const rejected = error.code === "23514" || /^order_/.test(error.message);
    console.error("[order] submit failed", { code: error.code, message: error.message });
    return { ok: false, code: rejected ? "rejected" : "failed" };
  }

  return { ok: true, id: String(data) };
}
