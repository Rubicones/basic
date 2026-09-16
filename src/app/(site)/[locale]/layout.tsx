import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fontClassNames } from "@/styles/fonts";
import { HTML_LANG, LOCALES, OG_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { localeAlternates } from "@/lib/seo";
import "@/styles/globals.css";

/**
 * This is the root layout — there is no app/layout.tsx, so that `<html lang>`
 * can be the rendered locale rather than a guess.
 *
 * The font pair is chosen per locale — see src/styles/fonts.ts.
 */

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  const locale: Locale = raw;
  const t = getDictionary(locale);
  const { canonical, languages } = localeAlternates("/");

  return {
    title: t.meta.title,
    description: t.meta.description,
    alternates: { canonical: canonical(locale), languages },
    openGraph: {
      title: t.meta.title,
      description: t.meta.description,
      url: canonical(locale),
      locale: OG_LOCALE[locale],
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
      type: "website",
    },
    twitter: { card: "summary_large_image", title: t.meta.title, description: t.meta.description },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // An unknown segment is a 404, not a redirect — a redirect here would make
  // every typo resolve to a real page and pollute the index.
  if (!isLocale(locale)) notFound();

  const t = getDictionary(locale);

  return (
    <html lang={HTML_LANG[locale]} className={fontClassNames(locale)}>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only">
          {t.nav.skipToContent}
        </a>
        {children}
      </body>
    </html>
  );
}
