import NextImage from "next/image";
import { cx } from "./cx";

/**
 * Every image on the site goes through here.
 *
 * The reference declared `width={1024} height={1024}` on an image rendered into a
 * 4:5 box, and gave the mobile card's image no dimensions at all — so the ratio
 * was a lie in one place and absent in the other. Here the container owns the
 * ratio and the image fills it, which makes layout shift structurally impossible.
 *
 * `sizes` is required rather than optional: without it Next serves the largest
 * candidate to every viewport, which is the single most common way an image
 * budget is blown.
 */

export type MediaProps = {
  src: string;
  alt: string;
  sizes: string;
  ratio?: "photo" | "portrait" | "square" | "wide";
  /** Only for the LCP image. More than one priority image is none. */
  priority?: boolean;
  rounded?: "card" | "inner" | "none";
  /** A tiny base64 preview, when the source can produce one. */
  blurDataURL?: string;
};

const ratios = {
  photo: "aspect-photo",
  portrait: "aspect-portrait",
  square: "aspect-square",
  wide: "aspect-wide",
} as const;

const radii = { card: "rounded-card", inner: "rounded-inner", none: "" } as const;

export function Media({
  src,
  alt,
  sizes,
  ratio = "photo",
  priority = false,
  rounded = "card",
  blurDataURL,
}: MediaProps) {
  return (
    <div
      className={cx(
        "bg-surface-sunken relative w-full overflow-hidden",
        ratios[ratio],
        radii[rounded],
      )}
    >
      <NextImage
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        {...(priority ? {} : { loading: "lazy" as const })}
        {...(blurDataURL ? { placeholder: "blur" as const, blurDataURL } : {})}
        className="object-cover"
      />
    </div>
  );
}
