"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { Badge, Button, Drawer, IconPlus, Stepper } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import { WavePattern } from "./wave-pattern";
import { photoFor } from "@/lib/catalog/photos";
import { WHOLE_MULTIPLIER, type Format, type Product } from "@/lib/catalog/products";
import { fill, formatPrice, formatWeight } from "@/lib/i18n/format";
import { useCart } from "@/lib/cart/context";
import type { Messages } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";

/**
 * One product card, for every screen size.
 *
 * The reference shipped two — `DessertCard` (`hidden md:block`) and
 * `MobileDessertCard` (`md:hidden`), 504 lines between them, both mounted, both in
 * the bundle, and already disagreeing about radius, surface, stepper height,
 * `aria-pressed` and spring constants. This is one component; the hover
 * affordances live behind `@media (hover: hover)` and the tap-to-open behaviour is
 * the baseline underneath them.
 *
 * The motion is the reference's, curve for curve — see the spring block in
 * globals.css. What changed is where it runs: CSS, off the main thread, with the
 * pointer feeding two custom properties instead of eight spring integrators.
 */

type Props = {
  product: Product;
  index: number;
  locale: Locale;
  t: Messages;
  priority: boolean;
};

export function ProductCard({ product, index, locale, t, priority }: Props) {
  const ref = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [whole, setWhole] = useState(false);

  const hasWhole = product.whole;
  const variant: "piece" | "whole" = hasWhole && whole ? "whole" : "piece";

  // The count belongs to the page's cart, not to this card: the order panel and
  // the mobile bar have to see the same number.
  const cart = useCart();
  const qty = cart.qtyOf(product.slug, variant);
  const photo = photoFor(product.slug);

  // The first way it keeps, ignoring "whole" — that is a variant, not storage.
  const storage = product.formats.find((f) => f !== "whole") ?? product.formats[0] ?? "chilled";

  const priceLabel = formatPrice(
    locale,
    variant === "whole" ? product.price * WHOLE_MULTIPLIER : product.price,
  );

  /**
   * On a phone the card has no room for the in-place reveal, so the photograph
   * opens a sheet with everything that did not fit. The width is read at click
   * time rather than during render: nothing rendered depends on it, so there is
   * nothing for hydration to disagree about.
   */
  const onPhoto = useCallback(() => {
    if (window.matchMedia("(min-width: 40rem)").matches) setOpen((v) => !v);
    else setSheet(true);
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el || event.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--px", String((event.clientX - r.left) / r.width - 0.5));
    el.style.setProperty("--py", String((event.clientY - r.top) / r.height - 0.5));
  }, []);

  const onPointerLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--px", "0");
    el.style.setProperty("--py", "0");
  }, []);

  return (
    <article
      ref={ref}
      data-card
      data-open={open || undefined}
      style={{ "--i": index } as React.CSSProperties}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="group/card card-drift card-enter perspective-card relative"
    >
      <div
        className={cx(
          "card-lift rounded-card relative overflow-hidden",
          /* Below sm the card sheds its frame: the design is a photograph with
             words under it, on the page, not a panel. */
          "sm:border-line sm:bg-surface-sunken sm:border sm:shadow-soft",
        )}
      >
        <div className="card-tilt relative">
          {/*
            The ribbons sit under the WHOLE card — photo and controls both — which
            is what makes the card warm through as it opens, rather than showing a
            halo around the picture only. `bg-surface-page` over the card's own
            surface, exactly as the reference layered cream over cream-deep.
          */}
          <div
            aria-hidden="true"
            className="card-waves text-brand absolute inset-0 z-0 hidden sm:block"
          >
            <div className="bg-surface-page absolute inset-0" />
            <WavePattern />
          </div>

          <div className="relative z-10">
            {/*
              The photo is the disclosure control — a real <button> with
              aria-expanded. The reference used a <div> with onClick, no role and no
              tabIndex, so on a touchscreen the description was unreachable by
              keyboard entirely.
            */}
            <button
              type="button"
              onClick={onPhoto}
              aria-expanded={open || sheet}
              aria-controls={`d-${product.slug}`}
              className="block w-full text-left"
            >
              {/* The frame carries the page ground: the margin baked into each photo
                  is the same cream, so at rest the two are indistinguishable and the
                  ribbons appear only once the frame contracts away from the card. */}
              <div className="card-frame bg-surface-page aspect-portrait relative w-full overflow-hidden">
                <Image
                  src={photo.src}
                  alt={product.name[locale]}
                  fill
                  sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
                  priority={priority}
                  {...(priority ? {} : { loading: "lazy" as const })}
                  {...(photo.blurDataURL
                    ? { placeholder: "blur" as const, blurDataURL: photo.blurDataURL }
                    : {})}
                  className="card-photo object-cover"
                />

                {/* A contrast floor, not a gradient that hopes the photo is dark —
                    most of this catalogue is a pale dessert on a pale surface. */}
                <div
                  aria-hidden="true"
                  className={cx(
                    "scrim absolute inset-x-0 bottom-0 h-1/2 transition-surface",
                    /* On a phone nothing sits on the photo until it is tapped,
                       so the contrast floor appears with what it is there for. */
                    "opacity-0 group-data-open/card:opacity-100 sm:opacity-100",
                  )}
                />

                <div className="absolute inset-x-0 bottom-0 p-5">
                  <div className="hidden items-end justify-between gap-4 sm:flex">
                    <h3 className="font-display text-title text-content-on-photo font-bold text-balance">
                      {product.name[locale]}
                    </h3>
                    <span className="font-display text-content-on-photo shrink-0 overflow-hidden font-bold">
                      {/* Keyed so a change restarts the slide, the way
                          AnimatePresence did in the reference. */}
                      <span key={variant} className="value-slide block text-body-sm">
                        {priceLabel}
                      </span>
                    </span>
                  </div>

                  <div id={`d-${product.slug}`} className="card-reveal">
                    <div>
                      {/* On a phone the note is always visible under the photo,
                          so what a tap reveals there is the storage line only. */}
                      <p className="text-body-sm text-content-on-photo/90 hidden pt-2 sm:block">
                        {product.note[locale]}
                      </p>
                      {/* How it keeps — the line a venue actually buys on. */}
                      <p className="text-micro text-content-on-photo/70 pt-2 uppercase">
                        {product.formats
                          .filter((f) => f !== "whole")
                          .map((f) => t.formats[f])
                          .join(" · ")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </button>

            {hasWhole && (
              <div className="absolute inset-x-3 bottom-3 z-20 sm:inset-x-auto sm:top-4 sm:right-4 sm:bottom-auto">
                <VariantToggle
                  whole={whole}
                  onChange={setWhole}
                  labels={[t.catalog.piece, t.catalog.wholeCake]}
                />
              </div>
            )}

            {qty > 0 && (
              <span
                key={qty}
                className={cx(
                  "badge-pop font-display bg-brand text-content-on-brand absolute z-20",
                  "grid size-8 place-items-center rounded-pill text-caption font-bold tabular-nums",
                  "sm:size-9 sm:text-body-sm",
                  /* In the corner, with the inset the card can afford: 8px on a
                     173px phone card, 16px once there is room. The whole-cake
                     offset is a desktop concern — below sm the toggle sits at the
                     foot of the photograph, not its head. */
                  "top-2 right-2 sm:right-4",
                  hasWhole ? "sm:top-16" : "sm:top-4",
                )}
              >
                {qty}
              </span>
            )}
          </div>

          {/* The phone layout. The other branch is `display:none` at this width,
              which also keeps it out of the accessibility tree — so nothing here
              is announced twice. */}
          <div className="relative z-10 px-1 pt-3 pb-1 sm:hidden">
            {/* `text-body-sm` on the row, not only on the title: `2lh` resolves
                against this element's own line box, and without it the floor was
                measured in the inherited body line-height and left a gap. */}
            <div className="min-h-title-2 text-body-sm flex items-baseline justify-between gap-2">
              <h3 className="font-display text-body-sm line-clamp-2 min-w-0 font-bold text-balance">
                {product.name[locale]}
              </h3>
              <span
                key={variant}
                className="value-slide font-display text-body shrink-0 font-bold tabular-nums"
              >
                {priceLabel}
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              {/* One chip, and the short label: the joined list was wider than the
                  column, which pushed the add button past the card's own edge. */}
              <span className="min-w-0 truncate">
                <Badge tone={storageTone(storage)}>{t.formatsShort[storage]}</Badge>
              </span>

              <Button
                variant="inverse"
                shape="circle"
                aria-label={variant === "whole" ? t.catalog.addWhole : t.catalog.add}
                onClick={() => cart.add(product.slug, variant)}
              >
                <IconPlus size={20} />
              </Button>
            </div>
          </div>

          {/* Everything the phone card leaves out. The kit's Drawer is a native
              <dialog> opened with showModal(), so focus trapping, Esc and the
              inertness of the page behind it are the platform's job, not ours. */}
          <Drawer open={sheet} onClose={() => setSheet(false)} title={product.name[locale]}>
            <div className="flex flex-col gap-5">
              <div className="bg-surface-sunken aspect-photo relative w-full overflow-hidden rounded-inner">
                <Image
                  src={photo.src}
                  alt={product.name[locale]}
                  fill
                  sizes="(min-width: 40rem) 24rem, 92vw"
                  loading="lazy"
                  {...(photo.blurDataURL
                    ? { placeholder: "blur" as const, blurDataURL: photo.blurDataURL }
                    : {})}
                  className="object-cover"
                />
              </div>

              <div className="flex items-baseline justify-between gap-4">
                <span className="text-body-sm text-content-secondary">
                  {variant === "whole" ? t.catalog.wholeCake : t.catalog.piece}
                </span>
                <span className="font-display text-display-sm text-brand font-bold tabular-nums">
                  {priceLabel}
                </span>
              </div>

              <p className="text-body text-content-secondary">{product.note[locale]}</p>

              <dl className="border-line flex items-baseline justify-between gap-4 border-y py-3">
                <dt className="text-body-sm text-content-secondary">{t.catalog.weight}</dt>
                <dd className="font-display text-body font-bold tabular-nums">
                  {formatWeight(locale, product.weightG)}
                </dd>
              </dl>

              <div>
                <p className="text-micro text-content-secondary mb-2 uppercase">
                  {t.catalog.storage}
                </p>
                <div className="flex flex-wrap gap-2">
                  {/* Storage only: "whole" is a variant of the thing, not a way
                      of keeping it, and listing it here said neither. */}
                  {product.formats
                    .filter((f) => f !== "whole")
                    .map((f) => (
                      <Badge key={f} tone={storageTone(f)}>
                        {t.formats[f]}
                      </Badge>
                    ))}
                </div>
              </div>

              <div>
                <p className="text-micro text-content-secondary mb-2 uppercase">
                  {t.catalog.nutritionTitle}
                  <span className="lowercase"> — {t.catalog.per100}</span>
                </p>
                <dl className="border-line grid grid-cols-2 gap-x-4 gap-y-2 rounded-inner border p-4">
                  {(
                    [
                      [t.catalog.kcal, `${product.nutrition.kcal} kcal`],
                      [t.catalog.protein, formatWeight(locale, product.nutrition.protein, true)],
                      [t.catalog.fat, formatWeight(locale, product.nutrition.fat, true)],
                      [t.catalog.carbs, formatWeight(locale, product.nutrition.carbs, true)],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label} className="flex items-baseline justify-between gap-3">
                      <dt className="text-body-sm text-content-secondary">{label}</dt>
                      <dd className="font-display text-body-sm font-bold tabular-nums">{value}</dd>
                    </div>
                  ))}
                </dl>
                {/* Said out loud rather than left to be discovered: a declaration
                    goes out with every delivery, and these are not measurements. */}
                <p className="text-caption text-content-tertiary mt-2">{t.catalog.nutritionNote}</p>
              </div>

              {hasWhole && (
                <VariantToggle
                  whole={whole}
                  onChange={setWhole}
                  labels={[t.catalog.piece, t.catalog.wholeCake]}
                />
              )}

              <div className="flex items-center gap-3">
                <Stepper
                  value={qty}
                  onDecrement={() => cart.remove(product.slug, variant)}
                  onIncrement={() => cart.add(product.slug, variant)}
                  decrementLabel={t.catalog.removeOne}
                  incrementLabel={t.catalog.addOne}
                  valueLabel={fill(t.order.lineQuantity, { name: product.name[locale] })}
                />
                <Button
                  variant="solidWipe"
                  onClick={() => cart.add(product.slug, variant)}
                  fullWidth
                >
                  {variant === "whole" ? t.catalog.addWhole : t.catalog.add}
                </Button>
              </div>
            </div>
          </Drawer>

          <div className="relative z-10 hidden grid-cols-control-fill items-center gap-3 p-5 sm:grid">
            <Stepper
              value={qty}
              onDecrement={() => cart.remove(product.slug, variant)}
              onIncrement={() => cart.add(product.slug, variant)}
              decrementLabel={t.catalog.removeOne}
              incrementLabel={t.catalog.addOne}
              valueLabel={fill(t.order.lineQuantity, { name: product.name[locale] })}
            />

            <Button variant="solidWipe" onClick={() => cart.add(product.slug, variant)} fullWidth>
              {variant === "whole" ? t.catalog.addWhole : t.catalog.add}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

/** Colour follows the storage class, and never carries it alone. */
function storageTone(format: Format): "chilled" | "frozen" | "ambient" | "brand" {
  return format === "whole" ? "brand" : format;
}

/**
 * A radio group, not two toggle buttons.
 *
 * The reference used a pair of `aria-pressed` buttons, which announces two
 * independent switches rather than one choice of two. The sliding indicator
 * replaces Framer's shared-element `layoutId` with a translated element on the
 * same spring.
 */
function VariantToggle({
  whole,
  onChange,
  labels,
}: {
  whole: boolean;
  onChange: (whole: boolean) => void;
  labels: [string, string];
}) {
  return (
    <div
      role="radiogroup"
      /*
       * A grid, not a flex row of `w-1/2` children. Halving a flex child whose
       * label is `nowrap` is circular — the browser resolves it by letting the
       * label spill, which is why "Cela torta" and "Целый торт" hung off the right
       * edge of the card at 320 and 390px. Equal grid columns size to the widest
       * label and the track sizes to them.
       */
      className={cx(
        "border-line bg-surface-raised/90 relative grid max-w-full grid-cols-2 rounded-pill border p-1",
        "shadow-soft backdrop-blur-md",
      )}
    >
      <span
        aria-hidden="true"
        style={{ "--seg": whole ? 1 : 0 } as React.CSSProperties}
        className="pill-indicator bg-brand absolute inset-y-1 left-1 rounded-pill"
      />
      {labels.map((label, i) => {
        const active = (i === 1) === whole;
        return (
          <button
            key={label}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(i === 1)}
            className={cx(
              /* Two columns of a 390px phone leave the toggle about 140px. The label
                 steps down rather than being clipped — "Whole cak" is not a word. */
              "relative z-10 rounded-pill px-1.5 py-1.5 text-micro font-semibold whitespace-nowrap transition-ink",
              "sm:px-3 sm:text-caption",
              active ? "text-content-on-brand" : "text-content-secondary hover:text-brand",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
