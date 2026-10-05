import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

/**
 * Everything public is crawlable; the console, the design-system playground and
 * API routes are not. `/dev` lives under a locale (`/en/dev/uikit`), hence the
 * wildcard — a bare `/dev` would match nothing. The playground also carries its
 * own `noindex`, so a link from elsewhere cannot get it indexed either.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/*/dev/", "/api/"],
      },
    ],
    sitemap: `${env.siteUrl}/sitemap.xml`,
    host: env.siteUrl,
  };
}
