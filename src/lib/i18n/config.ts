export const LOCALES = ["sr", "ru", "en"] as const;

export type Locale = (typeof LOCALES)[number];

/** English is the fallback: unmatched Accept-Language and x-default both land here. */
export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "NEXT_LOCALE";

/** One year. Only written by an explicit switch, never by header detection. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** BCP 47 tags for `<html lang>`, `og:locale` and Intl. */
export const HTML_LANG: Record<Locale, string> = {
  sr: "sr-Latn-RS",
  ru: "ru-RU",
  en: "en",
};

export const OG_LOCALE: Record<Locale, string> = {
  sr: "sr_RS",
  ru: "ru_RU",
  en: "en_US",
};

export const LOCALE_LABEL: Record<Locale, string> = {
  sr: "Srpski",
  ru: "Русский",
  en: "English",
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}
