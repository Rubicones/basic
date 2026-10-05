import type { MetadataRoute } from "next";
import { LOCALES } from "@/lib/i18n/config";
import { absoluteUrl, localeAlternates } from "@/lib/seo";
import { LEGAL_SLUGS, getLegalDoc } from "@/lib/legal";
import { getCatalog } from "@/lib/catalog/source";

/**
 * Every page is emitted once per locale, each entry carrying the full alternates
 * set — so all three URLs are discoverable regardless of which one a crawler
 * reaches first.
 *
 * The landing page also lists the product photography (Google image sitemap), so
 * the desserts can be found through image search. The catalogue lives in the
 * database; if it cannot be read, the sitemap is still served, just without the
 * pictures — a failed sitemap is worse than a thinner one.
 */

/** Same window as the catalogue page. */
export const revalidate = 3600;

async function productImages(): Promise<string[]> {
  try {
    const products = await getCatalog();
    return [...new Set(products.map((p) => p.photo.src).filter(Boolean))].map(absoluteUrl);
  } catch {
    return [];
  }
}

function isoDate(value: string): Date | undefined {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const images = await productImages();
  const now = new Date();

  const home = LOCALES.map((locale) => {
    const { canonical, languages } = localeAlternates("/");
    return {
      url: canonical(locale),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 1,
      alternates: { languages },
      images,
    };
  });

  const legal = LEGAL_SLUGS.flatMap((slug) => {
    const { canonical, languages } = localeAlternates(`/${slug}`);
    return LOCALES.map((locale) => ({
      url: canonical(locale),
      lastModified: isoDate(getLegalDoc(slug, locale).updated) ?? now,
      changeFrequency: "yearly" as const,
      priority: 0.3,
      alternates: { languages },
    }));
  });

  return [...home, ...legal];
}
