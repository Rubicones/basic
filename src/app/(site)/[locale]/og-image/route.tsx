import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { LOCALES, isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { OG_IMAGE_SIZE } from "@/lib/seo";
import photos from "@/lib/catalog/photos.json";
import { BRAND_HEX } from "@/styles/brand-hex";

/**
 * The social card — what a link to the site looks like in Telegram, WhatsApp,
 * Viber, Facebook, X, LinkedIn and Slack. One per locale, 1200×630.
 *
 * Built from the landing's own copy (the hero headline) and the shop's own
 * photography, so it says what the page says. Rendered once per locale at build:
 * it reads nothing but the dictionary and files in the repository, so unlike the
 * landing page it has no reason to wait for a request.
 *
 * Satori cannot read woff2, so Unbounded is shipped a second time as TTF in
 * styles/fonts/og — the same subset, Latin and Cyrillic included.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

const COLORS = BRAND_HEX;

const MARK =
  "M52.77 117.03C49.45 116.98 42.62 116.86 37.59 116.76C32.56 116.67 23.26 116.56 16.93 116.53L5.42 116.47L4.96 115.44C-1.62 100.68 -1.63 82.05 4.93 62.96C8.36 53.0 13.86 43.01 19.39 36.7C19.99 36.01 21.06 34.74 21.77 33.86C29.16 24.73 35.54 18.75 43.29 13.67C61.14 1.98 82.05 -0.34 101.26 7.24C118.99 14.23 124.67 29.72 115.94 47.27C110.24 58.73 102.22 63.43 92.74 60.87C91.12 60.43 86.45 59.67 82.09 59.13C69.95 57.62 58.11 57.85 50.3 59.73C47.28 60.46 46.36 60.9 46.79 61.42C47.09 61.78 48.04 61.83 55.67 61.92C63.09 62.01 64.68 62.07 68.77 62.41C78.48 63.22 89.94 65.39 94.79 67.34C105.35 71.58 111.97 82.21 110.9 93.21C109.93 103.2 103.06 111.53 92.09 116.04C90.62 116.64 90.36 116.67 85.21 116.94C82.31 117.09 60.41 117.15 52.77 117.03ZM64.38 89.78C65.14 89.39 65.75 88.54 65.75 87.9C65.75 84.86 57.25 78.99 45.67 74.04C40.03 71.63 36.26 70.62 34.37 71.01C33.19 71.26 32.41 72.3 32.58 73.39C32.83 74.91 35.95 77.89 40.42 80.87C47.13 85.34 54.99 88.9 60.33 89.88C61.83 90.15 63.76 90.11 64.38 89.78ZM42.64 51.11C51.26 49.64 70.76 36.83 71.67 32.03C72.01 30.22 70.7 28.12 68.59 27.08C66.6 26.11 64.86 26.03 62.98 26.82C57.35 29.2 45.95 37.93 41.14 43.54C37.49 47.8 37.02 50.4 39.77 51.14C40.47 51.33 41.43 51.32 42.64 51.11Z";

const markSvg = (color: string) =>
  `data:image/svg+xml;base64,${Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><path fill="${color}" fill-rule="evenodd" d="${MARK}"/></svg>`,
  ).toString("base64")}`;

/** The hero dessert. Looked up by slug, because the filename carries a content hash. */
const PHOTO_SLUG = "medovik";

const root = process.cwd();

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return new Response("Not found", { status: 404 });
  const t = getDictionary(locale);

  const photoFile = (photos as Record<string, { file: string }>)[PHOTO_SLUG]?.file;

  const [display800, display700, photo] = await Promise.all([
    readFile(join(root, "src/styles/fonts/og/unbounded-800.ttf")),
    readFile(join(root, "src/styles/fonts/og/unbounded-700.ttf")),
    photoFile ? readFile(join(root, "public/products", photoFile)) : Promise.resolve(null),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: COLORS.page,
          fontFamily: "Unbounded",
          color: COLORS.ink,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decoration, as in the hero: a large soft mark bleeding off the corner. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={markSvg(COLORS.brandSoft)}
          width={360}
          height={360}
          alt=""
          style={{ position: "absolute", left: -110, bottom: -130, transform: "rotate(-12deg)" }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "64px 0 64px 72px",
            width: 730,
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={markSvg(COLORS.brand)} width={64} height={64} alt="" />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 44, fontWeight: 800, color: COLORS.brand, lineHeight: 1 }}>
                basıc
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, opacity: 0.6, marginTop: 6 }}>
                {t.nav.tagline}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 60, fontWeight: 800, lineHeight: 1.08, letterSpacing: -1 }}>
              {t.hero.headlineTop}
            </div>
            <div
              style={{
                fontSize: 60,
                fontWeight: 800,
                lineHeight: 1.08,
                letterSpacing: -1,
                color: COLORS.brand,
                marginTop: 8,
              }}
            >
              {t.hero.headlineBottom}
            </div>
          </div>

          <div style={{ display: "flex" }}>
            <div
              style={{
                display: "flex",
                fontSize: 24,
                fontWeight: 700,
                color: COLORS.onBrand,
                background: COLORS.brand,
                borderRadius: 999,
                padding: "14px 28px",
              }}
            >
              {t.meta.ogBadge}
            </div>
          </div>
        </div>

        {photo ? (
          <div style={{ display: "flex", padding: "40px 40px 40px 0", flex: 1 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/jpeg;base64,${photo.toString("base64")}`}
              alt=""
              width={430}
              height={550}
              style={{ objectFit: "cover", borderRadius: 36, width: 430, height: 550 }}
            />
          </div>
        ) : null}
      </div>
    ),
    {
      ...OG_IMAGE_SIZE,
      fonts: [
        { name: "Unbounded", data: display800, weight: 800, style: "normal" },
        { name: "Unbounded", data: display700, weight: 700, style: "normal" },
      ],
      headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
    },
  );
}
