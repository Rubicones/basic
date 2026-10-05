import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { fontClassNames } from "@/styles/fonts";
import { HTML_LANG, LOCALES, OG_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { localeAlternates, ogImage } from "@/lib/seo";
import { env } from "@/lib/env";
import { COMPANY } from "@/lib/legal/company";
import { Consent } from "@/components/site/consent";
import { CONSENT_PREPAINT } from "@/lib/consent/prepaint";
import { BRAND_HEX } from "@/styles/brand-hex";
import "@/styles/globals.css";

/**
 * `viewport-fit=cover` is what makes `env(safe-area-inset-*)` non-zero on iOS —
 * without it the cookie strip and the order bar sit under the home indicator.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // The page surface (--color-surface-page), so the browser chrome on mobile
  // continues the page instead of cutting it off with white.
  themeColor: BRAND_HEX.page,
  colorScheme: "light",
};

/**
 * This is the root layout — there is no app/layout.tsx, so that `<html lang>`
 * can be the rendered locale rather than a guess.
 *
 * The font pair is chosen per locale — see src/styles/fonts.ts.
 */

/**
 * The three locales are known, and deliberately not pre-generated.
 *
 * Returning them here would have the build render the landing page, and the
 * landing page is a catalogue that lives in a database — so a deploy would start
 * failing whenever Supabase blinked, and a build made before the shop added a
 * product would ship that emptiness as a static file. The pages are rendered on
 * first request and cached from then on (`revalidate` on the page), which is the
 * same output with none of that coupling.
 *
 * `dynamicParams` is on by default; `isLocale` is what refuses a fourth language.
 */
export function generateStaticParams(): { locale: string }[] {
  return [];
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
  const url = canonical(locale);
  const image = ogImage(locale, t);
  const { google, yandex, bing } = env.searchVerification;

  return {
    metadataBase: new URL(env.siteUrl),
    // The landing page uses `default`; every page below sets only its own name
    // and gets the brand appended.
    title: { default: t.meta.title, template: `%s | ${t.meta.siteName}` },
    description: t.meta.description,
    keywords: t.meta.keywords,
    applicationName: t.meta.siteName,
    authors: [{ name: COMPANY.legalName, url: env.siteUrl }],
    creator: COMPANY.legalName,
    publisher: COMPANY.legalName,
    category: "food",
    alternates: { canonical: url, languages },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    // iOS otherwise turns prices and order numbers into phone links.
    formatDetection: { telephone: false, address: false, email: false },
    openGraph: {
      type: "website",
      siteName: t.meta.siteName,
      title: t.meta.ogTitle,
      description: t.meta.ogDescription,
      url,
      locale: OG_LOCALE[locale],
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: t.meta.ogTitle,
      description: t.meta.ogDescription,
      images: [image],
    },
    ...(google || yandex || bing
      ? {
          verification: {
            ...(google ? { google } : {}),
            ...(yandex ? { yandex } : {}),
            ...(bing ? { other: { "msvalidate.01": bing } } : {}),
          },
        }
      : {}),
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
    <html lang={HTML_LANG[locale]} className={fontClassNames()}>
      <head>
        {/* Before first paint: hides the server-rendered cookie banner when a
            current decision is stored, so it never flashes. */}
        <script dangerouslySetInnerHTML={{ __html: CONSENT_PREPAINT }} />
      </head>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only">
          {t.nav.skipToContent}
        </a>
        {children}
        <Consent locale={locale} t={t} />
      </body>
    </html>
  );
}
