import { DEFAULT_LOCALE, LOCALES, type Locale } from "./config";

/**
 * Accept-Language negotiation over quality values.
 *
 * Not `startsWith`: `sr-Latn-RS`, `sr-RS` and `sr-Cyrl` all have to resolve to
 * `sr`, `ru-RU` and `ru-BY` to `ru`, and a client that ranks
 * `de, sr;q=0.8, en;q=0.9` has to get `en`, not `sr`.
 *
 * This is RFC 4647 *lookup* narrowed to our case: our three locales carry no
 * region or script, so comparing primary subtags is sufficient and correct. The
 * day `sr-Cyrl` ships as its own locale this needs script-aware matching — the
 * shape below leaves room for it, but it is not written yet, because writing it
 * now would be untested code guarding a case that does not exist.
 */

type Ranked = { tag: string; q: number };

const MAX_ENTRIES = 24; // a browser sends ~5; the cap is for hostile input

function parse(header: string): Ranked[] {
  return header
    .split(",")
    .slice(0, MAX_ENTRIES)
    .map((part, index): Ranked | null => {
      const [rawTag, ...params] = part.trim().split(";");
      const tag = rawTag?.trim().toLowerCase();
      if (!tag) return null;

      let q = 1;
      for (const param of params) {
        const [key, value] = param.split("=");
        if (key?.trim().toLowerCase() !== "q") continue;
        const parsed = Number.parseFloat(value ?? "");
        // A malformed q is treated as 1, per the spec's leniency.
        q = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 1) : 1;
      }

      // q=0 means "not acceptable" — an explicit veto, not a low preference.
      if (q === 0) return null;

      // `index` keeps the sort stable for equal q, preserving the client's order.
      return { tag, q: q - index * 1e-6 };
    })
    .filter((entry): entry is Ranked => entry !== null)
    .sort((a, b) => b.q - a.q);
}

/** `sr-latn-rs` → `sr`. The wildcard means "anything", so it yields the default. */
function toLocale(tag: string): Locale | null {
  if (tag === "*") return DEFAULT_LOCALE;
  const primary = tag.split("-")[0];
  if (!primary) return null;
  return LOCALES.find((locale) => locale === primary) ?? null;
}

export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  for (const { tag } of parse(acceptLanguage)) {
    const locale = toLocale(tag);
    if (locale) return locale;
  }
  return DEFAULT_LOCALE;
}
