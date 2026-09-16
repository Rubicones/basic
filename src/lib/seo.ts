import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/i18n/config";
import { env } from "@/lib/env";

/**
 * Canonical and hreflang for one page.
 *
 * Every page is self-canonical to its own locale URL, carries all three locales
 * as alternates, and points x-default at English. Emitting a partial hreflang set
 * — or canonicalising every locale to one of them — is what makes search engines
 * pick a single locale and drop the rest.
 */
export function localeAlternates(path = "") {
  const clean = path === "/" ? "" : path.replace(/\/$/, "");

  const languages = Object.fromEntries(
    LOCALES.map((locale) => [locale, `${env.siteUrl}/${locale}${clean}`]),
  ) as Record<Locale, string>;

  return {
    canonical: (locale: Locale) => `${env.siteUrl}/${locale}${clean}`,
    languages: {
      ...languages,
      "x-default": `${env.siteUrl}/${DEFAULT_LOCALE}${clean}`,
    },
  };
}
