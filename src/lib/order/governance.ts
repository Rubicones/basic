import type { Locale } from "@/lib/i18n/config";

/**
 * What the order form may and may not ask — the code side of the privacy
 * policy's Section 2 ("Limits on what we request").
 *
 * The database enforces purpose and "special category is never required"
 * (migration 0011). This file holds the rule that is a keyword match: no field
 * for card numbers, bank accounts or government IDs. The console refuses to save
 * a field whose key, type or label in any language matches one of these.
 */

/** Lower-case fragments, matched against key, input type and every label. */
export const FORBIDDEN_FIELD_KEYWORDS = [
  // payment cards
  "card number",
  "credit card",
  "debit card",
  "cvv",
  "cvc",
  "card_number",
  "номер карты",
  "банковская карта",
  "кредитная карта",
  "broj kartice",
  "platna kartica",
  "kreditna kartica",
  // bank accounts
  "iban",
  "swift",
  "bic",
  "bank account",
  "account number",
  "расчётный счёт",
  "расчетный счет",
  "банковский счёт",
  "банковский счет",
  "номер счёта",
  "номер счета",
  "tekući račun",
  "tekuci racun",
  "broj računa",
  "broj racuna",
  "bankovni račun",
  // government identifiers
  "passport",
  "national id",
  "id number",
  "social security",
  "jmbg",
  "паспорт",
  "снилс",
  "личный номер",
  "pasoš",
  "pasos",
  "lična karta",
  "licna karta",
  "lk broj",
] as const;

/** The first forbidden keyword found in any of the texts, or null. */
export function forbiddenKeyword(texts: string[]): string | null {
  const haystack = texts.join(" \n ").toLowerCase();
  for (const word of FORBIDDEN_FIELD_KEYWORDS) {
    // Short tokens (bic, cvv, jmbg …) must stand alone, or "public" would match.
    const pattern =
      word.length <= 4 ? new RegExp(`(^|[^\\p{L}\\p{N}])${word}([^\\p{L}\\p{N}]|$)`, "u") : null;
    if (pattern ? pattern.test(haystack) : haystack.includes(word)) return word;
  }
  return null;
}

export type FieldSensitivity = "normal" | "special_category";

/**
 * Purposes of the shipped fields — what the seed writes, and what migration 0011
 * filled in for databases that already had them. Keep the two in step.
 */
export const DEFAULT_PURPOSES: Record<string, Record<Locale, string>> = {
  venue: {
    en: "Identify the venue placing the order and address the invoice.",
    ru: "Определить заведение, от имени которого сделан заказ, и выставить счёт.",
    sr: "Identifikacija lokala koji poručuje i izdavanje računa.",
  },
  contact: {
    en: "Know whom to speak to about the order.",
    ru: "Знать, с кем связаться по заказу.",
    sr: "Da znamo s kim da razgovaramo o porudžbini.",
  },
  phone: {
    en: "Confirm the order and arrange delivery.",
    ru: "Подтвердить заказ и согласовать доставку.",
    sr: "Potvrda porudžbine i dogovor o dostavi.",
  },
  email: {
    en: "Send the invoice or order information by e-mail, if you want it.",
    ru: "Отправить счёт или информацию о заказе по почте, если вы этого хотите.",
    sr: "Slanje računa ili informacija o porudžbini e-poštom, ako to želite.",
  },
  city: {
    en: "Plan the delivery and apply the terms for your city.",
    ru: "Спланировать доставку и применить условия для вашего города.",
    sr: "Planiranje dostave i primena uslova za vaš grad.",
  },
  date: {
    en: "Schedule production and delivery.",
    ru: "Запланировать приготовление и доставку.",
    sr: "Planiranje pripreme i dostave.",
  },
  comment: {
    en: "Take delivery, packing and kitchen notes into account.",
    ru: "Учесть пожелания по доставке, упаковке и для кухни.",
    sr: "Uvažavanje napomena o dostavi, pakovanju i za kuhinju.",
  },
};
