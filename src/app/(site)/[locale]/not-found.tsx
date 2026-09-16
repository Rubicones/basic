import Link from "next/link";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

/**
 * Rendered when the locale segment itself is invalid, so `params` is not
 * trustworthy here — English is the honest choice.
 */
export default function NotFound() {
  const t = getDictionary(DEFAULT_LOCALE);

  return (
    <main id="main" className="mx-auto grid min-h-screen max-w-md place-items-center px-5 text-center">
      <div>
        <h1 className="text-display-md">{t.error.notFoundTitle}</h1>
        <p className="text-content-secondary mt-3 text-body-sm">{t.error.notFoundBody}</p>
        <Link
          href={`/${DEFAULT_LOCALE}`}
          className="bg-brand text-content-on-brand hover:bg-brand-hover mt-8 inline-flex h-11 items-center rounded-pill px-6 text-body-sm font-bold transition-colors"
        >
          {t.error.home}
        </Link>
      </div>
    </main>
  );
}
