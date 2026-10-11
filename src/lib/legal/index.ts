import type { Locale } from "@/lib/i18n/config";
import type { LegalDoc } from "./types";
import { privacyEn } from "./privacy/en";
import { privacyRu } from "./privacy/ru";
import { privacySr } from "./privacy/sr";
import { cookiePolicy } from "./cookies";
import { termsEn } from "./terms/en";
import { termsRu } from "./terms/ru";
import { termsSr } from "./terms/sr";

/**
 * Every legal page, by its URL slug.
 *
 * The route, footer links and sitemap all read this table. Each document also
 * has a localized footer label in the i18n dictionaries.
 */
export const LEGAL_DOCS = {
  "privacy-policy": { en: privacyEn, ru: privacyRu, sr: privacySr },
  "cookie-policy": cookiePolicy,
  "terms-of-use": { en: termsEn, ru: termsRu, sr: termsSr },
} satisfies Record<string, Record<Locale, LegalDoc>>;

export type LegalSlug = keyof typeof LEGAL_DOCS;

export const LEGAL_SLUGS = Object.keys(LEGAL_DOCS) as LegalSlug[];

export function isLegalSlug(value: string): value is LegalSlug {
  return value in LEGAL_DOCS;
}

export function getLegalDoc(slug: LegalSlug, locale: Locale): LegalDoc {
  return LEGAL_DOCS[slug][locale];
}

export { COMPANY } from "./company";
export type { LegalBlock, LegalDoc, LegalSection } from "./types";
