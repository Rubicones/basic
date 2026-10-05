import { DEFAULT_LOCALE, HTML_LANG, LOCALES, type Locale } from "@/lib/i18n/config";
import { env } from "@/lib/env";
import { COMPANY } from "@/lib/legal/company";
import type { Messages } from "@/lib/i18n/dictionaries";
import type { Product } from "@/lib/catalog/products";

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

/** Site-relative or already absolute → absolute. Structured data accepts nothing else. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${env.siteUrl}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** The social card. One per locale, rendered by `[locale]/og-image/route.tsx`. */
export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

export function ogImage(locale: Locale, t: Messages) {
  return {
    url: absoluteUrl(`/${locale}/og-image`),
    ...OG_IMAGE_SIZE,
    alt: t.meta.ogImageAlt,
    type: "image/png",
  };
}

/**
 * JSON-LD as a string safe to drop into `<script type="application/ld+json">`.
 * `<` is escaped so a product name can never close the script element.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/* ---- structured data ------------------------------------------------------ */

const ids = {
  business: () => `${env.siteUrl}/#business`,
  website: () => `${env.siteUrl}/#website`,
  logo: () => `${env.siteUrl}/#logo`,
};

/**
 * The business, once. A dessert kitchen supplying venues is a `Bakery` in
 * schema.org terms (a LocalBusiness → FoodEstablishment), which is what lets it
 * show up with an address, phone and service area rather than as a bare website.
 */
function businessNode(locale: Locale, t: Messages) {
  return {
    "@type": "Bakery",
    "@id": ids.business(),
    name: COMPANY.brand,
    legalName: COMPANY.legalName,
    description: t.meta.description,
    slogan: `${t.hero.headlineTop} ${t.hero.headlineBottom}`,
    url: `${env.siteUrl}/${locale}`,
    logo: { "@type": "ImageObject", "@id": ids.logo(), url: absoluteUrl("/logo.png"), width: 512, height: 512 },
    image: absoluteUrl(`/${locale}/og-image`),
    telephone: COMPANY.phone,
    email: COMPANY.email,
    taxID: COMPANY.pib,
    identifier: { "@type": "PropertyValue", propertyID: "MB", value: COMPANY.mb },
    address: {
      "@type": "PostalAddress",
      streetAddress: COMPANY.street,
      postalCode: COMPANY.postcode,
      addressLocality: COMPANY.city,
      addressCountry: "RS",
    },
    areaServed: t.delivery.cities.map((city) => ({ "@type": "City", name: city.name })),
    servesCuisine: "Desserts",
    currenciesAccepted: "RSD",
    paymentAccepted: "Invoice",
    knowsLanguage: LOCALES.map((l) => HTML_LANG[l]),
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "sales",
      telephone: COMPANY.phone,
      email: COMPANY.email,
      areaServed: "RS",
      availableLanguage: LOCALES.map((l) => HTML_LANG[l]),
    },
  };
}

function websiteNode(t: Messages) {
  return {
    "@type": "WebSite",
    "@id": ids.website(),
    url: env.siteUrl,
    name: t.meta.siteName,
    inLanguage: LOCALES.map((l) => HTML_LANG[l]),
    publisher: { "@id": ids.business() },
  };
}

/** The landing page: business, site, page and the catalogue as an offer list. */
export function homeJsonLd(locale: Locale, t: Messages, products: Product[]) {
  const url = `${env.siteUrl}/${locale}`;

  const offers = products
    .filter((p) => p.name[locale])
    .map((p) => ({
      "@type": "Offer",
      url: `${url}#catalog`,
      price: p.price,
      priceCurrency: "RSD",
      availability: "https://schema.org/InStock",
      seller: { "@id": ids.business() },
      itemOffered: {
        "@type": "Product",
        name: p.name[locale],
        ...(p.note[locale] ? { description: p.note[locale] } : {}),
        sku: p.slug,
        ...(p.photo.src ? { image: absoluteUrl(p.photo.src) } : {}),
        brand: { "@type": "Brand", name: COMPANY.brand },
        category: "Desserts",
        ...(p.weightG ? { weight: { "@type": "QuantitativeValue", value: p.weightG, unitCode: "GRM" } } : {}),
      },
    }));

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        ...businessNode(locale, t),
        ...(offers.length
          ? {
              hasOfferCatalog: {
                "@type": "OfferCatalog",
                name: `${t.catalog.title} ${t.catalog.titleAccent}`,
                itemListElement: offers,
              },
            }
          : {}),
      },
      websiteNode(t),
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: t.meta.title,
        description: t.meta.description,
        inLanguage: HTML_LANG[locale],
        isPartOf: { "@id": ids.website() },
        about: { "@id": ids.business() },
        primaryImageOfPage: { "@type": "ImageObject", url: absoluteUrl(`/${locale}/og-image`) },
      },
    ],
  };
}

/** A legal document: the page itself and its breadcrumb back to the landing. */
export function legalJsonLd(
  locale: Locale,
  t: Messages,
  doc: { title: string; subtitle?: string; updated?: string },
  path: string,
) {
  const home = `${env.siteUrl}/${locale}`;
  const url = `${home}${path}`;
  const modified = doc.updated && /^\d{4}-\d{2}-\d{2}/.test(doc.updated) ? doc.updated : undefined;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: doc.title,
        ...(doc.subtitle ? { description: doc.subtitle } : {}),
        inLanguage: HTML_LANG[locale],
        isPartOf: { "@id": ids.website() },
        publisher: { "@id": ids.business() },
        ...(modified ? { dateModified: modified } : {}),
        breadcrumb: { "@id": `${url}#breadcrumb` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: t.meta.siteName, item: home },
          { "@type": "ListItem", position: 2, name: doc.title, item: url },
        ],
      },
      websiteNode(t),
    ],
  };
}
