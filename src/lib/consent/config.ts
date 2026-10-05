/**
 * Cookie consent — the data. The banner, the settings dialog, the cookie policy
 * page and the pre-paint check all read this file; none of them lists a cookie
 * of its own.
 *
 * What does NOT need consent and is therefore not gated: the cart (held in
 * memory today; localStorage would be necessary too), `NEXT_LOCALE`, the consent record itself, and the console's session/CSRF
 * cookies. They are listed under "necessary" so the dialog tells the whole truth.
 */

import type { Locale } from "@/lib/i18n/config";

export type ConsentCategory = "necessary" | "analytics" | "marketing";
export const OPTIONAL_CATEGORIES = ["analytics", "marketing"] as const;
export type OptionalCategory = (typeof OPTIONAL_CATEGORIES)[number];

/** GA4 measurement id, e.g. G-ABC123. Unset → analytics is offered but loads nothing. */
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";

/** The consent record. First-party, necessary, readable by the pre-paint script. */
export const CONSENT_COOKIE = "basic_consent";
/** A decision expires after 12 months and is asked again. */
export const CONSENT_MAX_AGE_DAYS = 365;
/** Bump when the banner/dialog wording or behaviour changes materially. */
export const CONSENT_UI_VERSION = "1";
/** The privacy/cookie policy version the decision was made against. */
export const CONSENT_POLICY_VERSION = "2026-10-01";

type Localized = Record<Locale, string>;

export type CookieInfo = {
  name: string;
  provider: string;
  purpose: Localized;
  duration: Localized;
};

const containerSuffix = GA_ID ? GA_ID.replace(/^G-/, "") : "<container-id>";

export const COOKIES: Record<ConsentCategory, CookieInfo[]> = {
  necessary: [
    {
      name: CONSENT_COOKIE,
      provider: "basic",
      purpose: {
        en: "Remembers your cookie choices.",
        ru: "Запоминает ваш выбор по cookie.",
        sr: "Pamti vaš izbor kolačića.",
      },
      duration: { en: "12 months", ru: "12 месяцев", sr: "12 meseci" },
    },
    {
      name: "NEXT_LOCALE",
      provider: "basic",
      purpose: {
        en: "Remembers the language you switched to.",
        ru: "Запоминает выбранный язык.",
        sr: "Pamti jezik koji ste izabrali.",
      },
      duration: { en: "12 months", ru: "12 месяцев", sr: "12 meseci" },
    },
  ],
  analytics: [
    {
      name: "_ga",
      provider: "Google (Google Analytics 4)",
      purpose: {
        en: "Distinguishes visitors to count visits.",
        ru: "Различает посетителей для подсчёта визитов.",
        sr: "Razlikuje posetioce radi brojanja poseta.",
      },
      duration: { en: "2 years", ru: "2 года", sr: "2 godine" },
    },
    {
      name: `_ga_${containerSuffix}`,
      provider: "Google (Google Analytics 4)",
      purpose: {
        en: "Keeps the state of the current visit.",
        ru: "Хранит состояние текущего визита.",
        sr: "Čuva stanje trenutne posete.",
      },
      duration: { en: "2 years", ru: "2 года", sr: "2 godine" },
    },
  ],
  // Nothing uses it yet; present so enabling ads later is a data change.
  marketing: [],
};

/**
 * A fingerprint of the categories and cookie names. A stored decision made
 * against a different fingerprint is void and the banner asks again.
 */
export const CONSENT_SCHEMA = (["necessary", ...OPTIONAL_CATEGORIES] as const)
  .map((c) => `${c}:${COOKIES[c].map((k) => k.name).join(",")}`)
  .join("|");

export type ConsentRecord = {
  /** Anonymous, random per browser; links the cookie to the server-side log. */
  id: string;
  /** ISO timestamp of the decision. */
  at: string;
  analytics: boolean;
  marketing: boolean;
  policy: string;
  ui: string;
  locale: Locale;
  schema: string;
};
