import photos from "./photos.json";
import demoPhotos from "./demo-photos.json";
import { env } from "@/lib/env";

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

export type Photo = { src: string; blurDataURL?: string };

/** Where the console uploads product photography. */
export const PHOTO_BUCKET = "product-photos";

/**
 * Six pictures across eighteen products, assigned by position in the catalogue
 * rather than by hashing the slug: a cycle guarantees that no two cards sitting
 * next to each other show the same dessert, which a hash does not.
 *
 * The position is passed in rather than looked up here. This module used to
 * import the fixture to find it, which became a cycle the moment the fixture
 * wanted a photograph of its own — and every caller knows the position anyway.
 */
export function demoPhotoAt(index: number): Photo {
  const photo = DEMO[`dessert-${(Math.max(index, 0) % 6) + 1}`];
  return {
    src: `/products/demo/${photo?.file ?? ""}`,
    ...(photo?.blur ? { blurDataURL: photo.blur } : {}),
  };
}

/** The shipped photograph for a fixture product. */
export function photoFor(slug: string, index = 0): Photo {
  if (env.catalogDemoPhotos) return demoPhotoAt(index);
  const photo = PHOTOS[slug];
  return {
    src: `/products/${photo?.file ?? ""}`,
    ...(photo?.blur ? { blurDataURL: photo.blur } : {}),
  };
}

/**
 * The photograph of a product that came out of the database.
 *
 * A path that starts with `/` is a file in `public` — that is how the seed points
 * at the photography already in the repository, so a seeded database needs no
 * storage bucket at all. Anything else is an object the console uploaded, which
 * is a bare hashed filename at the root of the bucket. Same rule the console
 * itself uses to build a preview.
 */
export function photoFromStorage(path: string | null, blur: string | null, index: number): Photo {
  if (env.catalogDemoPhotos) return demoPhotoAt(index);
  if (!path) return { src: "" };

  const src = path.startsWith("/")
    ? path
    : `${env.supabaseUrl}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`;

  return { src, ...(blur ? { blurDataURL: blur } : {}) };
}
