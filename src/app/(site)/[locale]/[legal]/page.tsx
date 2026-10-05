import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OG_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { legalJsonLd, localeAlternates, ogImage, serializeJsonLd } from "@/lib/seo";
import { getLegalDoc, isLegalSlug } from "@/lib/legal";
import { getFormAnnex } from "@/lib/legal/annex";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { LegalPage } from "@/components/site/legal-page";

/**
 * Every legal document, one route: /sr/privacy-policy, /ru/privacy-policy, …
 * The slug is checked against lib/legal, so anything else is a 404.
 */

type Params = Promise<{ locale: string; legal: string }>;

/** Annex 1 of the privacy policy is read from the database; same window as the catalogue. */
export const revalidate = 60;

export function generateStaticParams(): { legal: string }[] {
  return [];
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, legal } = await params;
  if (!isLocale(locale) || !isLegalSlug(legal)) return {};
  const doc = getLegalDoc(legal, locale);
  const t = getDictionary(locale);
  const { canonical, languages } = localeAlternates(`/${legal}`);
  const url = canonical(locale);
  const image = ogImage(locale, t);
  // `openGraph` and `twitter` replace the layout's objects rather than merging
  // into them, so everything the card needs is restated here.
  return {
    title: doc.title,
    description: doc.subtitle,
    alternates: { canonical: url, languages },
    openGraph: {
      type: "website",
      siteName: t.meta.siteName,
      title: `${doc.title} | ${t.meta.siteName}`,
      description: doc.subtitle,
      url,
      locale: OG_LOCALE[locale],
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: `${doc.title} | ${t.meta.siteName}`,
      description: doc.subtitle,
      images: [image],
    },
  };
}

export default async function LegalRoute({ params }: { params: Params }) {
  const { locale: raw, legal } = await params;
  if (!isLocale(raw) || !isLegalSlug(legal)) notFound();
  const locale: Locale = raw;
  const t = getDictionary(locale);
  const doc = getLegalDoc(legal, locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(legalJsonLd(locale, t, doc, `/${legal}`)) }}
      />
      <Header locale={locale} t={t} />
      <LegalPage
        doc={doc}
        locale={locale}
        t={t}
        {...(legal === "privacy-policy" ? { annex: await getFormAnnex(locale, doc.updated) } : {})}
      />
      <Footer locale={locale} t={t} path={`/${legal}`} />
    </>
  );
}
