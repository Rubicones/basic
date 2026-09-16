import type { MetadataRoute } from "next";
import { LOCALES } from "@/lib/i18n/config";
import { localeAlternates } from "@/lib/seo";

/**
 * Every page is emitted once per locale, each entry carrying the full alternates
 * set — so all three URLs are discoverable regardless of which one a crawler
 * reaches first.
 */
const PAGES = ["/"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PAGES.flatMap((path) => {
    const { canonical, languages } = localeAlternates(path);
    return LOCALES.map((locale) => ({
      url: canonical(locale),
      lastModified,
      changeFrequency: "weekly" as const,
      priority: path === "/" ? 1 : 0.7,
      alternates: { languages },
    }));
  });
}
