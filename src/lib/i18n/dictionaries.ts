import type { Locale } from "./config";
import { en, type Messages } from "./messages/en";
import { ru } from "./messages/ru";
import { sr } from "./messages/sr";

/**
 * `satisfies Record<Locale, Messages>` is the build gate: adding a locale to
 * LOCALES without a dictionary, or shipping a dictionary with a missing key,
 * fails `tsc` and therefore `next build`.
 */
const dictionaries = { en, ru, sr } satisfies Record<Locale, Messages>;

/**
 * Called from server components, so dictionaries stay out of the client bundle.
 * The one exception is the error boundary, which imports `en` directly.
 */
export function getDictionary(locale: Locale): Messages {
  return dictionaries[locale];
}

export type { Messages };
