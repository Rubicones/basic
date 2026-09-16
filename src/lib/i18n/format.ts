import { HTML_LANG, type Locale } from "./config";

/**
 * Formatting goes through Intl, always.
 *
 * Serbian has three plural forms and Russian four. `count === 1 ? x : y` renders
 * the wrong one for 2, 3, 4, 22 and most of the number line in both languages —
 * so it is banned by an ESLint rule, and this is what replaces it.
 */

export type PluralForms = {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  /** Required: every language has `other`, and it is the fallback for any gap. */
  other: string;
};

export function plural(locale: Locale, count: number, forms: PluralForms): string {
  const rule = new Intl.PluralRules(HTML_LANG[locale]).select(count);
  const form = forms[rule] ?? forms.other;
  return form.replace("{count}", formatNumber(locale, count));
}

export function formatNumber(locale: Locale, value: number): string {
  return new Intl.NumberFormat(HTML_LANG[locale]).format(value);
}

/**
 * A price in dinars.
 *
 * The currency is appended rather than run through `style: "currency"`, which
 * prints "RSD 570" in English and "570 RSD" in Serbian — a catalogue wants one
 * shape everywhere. A non-breaking space keeps the figure and its unit together.
 */
export function formatPrice(locale: Locale, amount: number): string {
  return `${new Intl.NumberFormat(HTML_LANG[locale]).format(amount)}\u00a0RSD`;
}

export function formatDate(
  locale: Locale,
  value: Date | string,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" },
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(HTML_LANG[locale], options).format(date);
}

/**
 * Fills placeholders in a message. One key holds one whole sentence — sentences
 * are never built by concatenating translated fragments, because word order is
 * not shared across these three languages.
 */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}
