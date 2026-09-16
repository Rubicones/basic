import photos from "./photos.json";

/**
 * Photo filenames carry a hash of their own bytes.
 *
 * Next keys its image cache on the URL, so re-exporting a photograph under the
 * same path leaves the previous version being served — which is what made two
 * rounds of "the photos are still cropped" a cache problem rather than a layout
 * one. A new export is a new URL, and the stale entry can never be reached.
 */
const PHOTOS = photos as Record<string, { file: string; blur: string }>;

export function photoFor(slug: string) {
  const photo = PHOTOS[slug];
  return { src: `/products/${photo?.file ?? ""}`, blurDataURL: photo?.blur };
}
