import type { Locale } from "@/lib/i18n/config";
import type { LegalDoc } from "./types";
import { privacyEn } from "./privacy/en";
import { privacyRu } from "./privacy/ru";
import { privacySr } from "./privacy/sr";
import { cookiePolicy } from "./cookies";

/**
 * Every legal page, by its URL slug.
 *
 * Adding the terms or the cookie policy is a folder with three translations and
 * one line here: the route (`app/(site)/[locale]/[legal]`), the footer links and
 * the sitemap all read this table, so nothing else has to change.
 */
export const LEGAL_DOCS = {
  "privacy-policy": { en: privacyEn, ru: privacyRu, sr: privacySr },
  "cookie-policy": cookiePolicy,
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
