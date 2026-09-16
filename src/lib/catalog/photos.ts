import photos from "./photos.json";
import demoPhotos from "./demo-photos.json";
import { env } from "@/lib/env";
import { PRODUCTS } from "./products";

/**
 * Photo filenames carry a hash of their own bytes.
 *
 * Next keys its image cache on the URL, so re-exporting a photograph under the
 * same path leaves the previous version being served — which is what made two
 * rounds of "the photos are still cropped" a cache problem rather than a layout
 * one. A new export is a new URL, and the stale entry can never be reached.
 */
const PHOTOS = photos as Record<string, { file: string; blur: string }>;

const DEMO = demoPhotos as Record<string, { file: string; blur: string }>;

/**
 * Six pictures across eighteen products, assigned by position in the catalogue
 * rather than by hashing the slug: a cycle guarantees that no two cards sitting
 * next to each other show the same dessert, which a hash does not.
 */
function demoFor(slug: string) {
  const index = PRODUCTS.findIndex((product) => product.slug === slug);
  const photo = DEMO[`dessert-${((index < 0 ? 0 : index) % 6) + 1}`];
  return { src: `/products/demo/${photo?.file ?? ""}`, blurDataURL: photo?.blur };
}

export function photoFor(slug: string) {
  if (env.catalogDemoPhotos) return demoFor(slug);
  const photo = PHOTOS[slug];
  return { src: `/products/${photo?.file ?? ""}`, blurDataURL: photo?.blur };
}
