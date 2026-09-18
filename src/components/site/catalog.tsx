"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Container, Grid, IconCheck, IconClose, IconSearch, Section, Stack } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import { ProductCard } from "./product-card";
import { FORMATS, PRODUCTS, type Format } from "@/lib/catalog/products";
import type { Messages } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";

/**
 * One catalogue.
 *
 * The reference had two — a desktop `Catalog` and a `MobileCatalog`, 504 lines,
 * both mounted at every width and already drifted apart on eight details. Here the
 * differences that were real (a snapping rail on narrow) are breakpoints, and the
 * ones that were accidental are gone. The reference's 3/4/5 density control went
 * with them: it was a preference nobody has, sitting where a filter belongs, and
 * three columns is the width the photographs were cropped for.
 *
 * The filter is by storage format, because that is the question a venue actually
 * asks: a café with no display case needs to see only what survives on a counter.
 * A product can be in several groups at once — the New York cheesecake is in three
 * — which the reference's single-category model could not express.
 */

const ALL = "all" as const;
type Filter = typeof ALL | Format;

/**
 * Folded for comparison: lower case, and accents stripped so that "cizkejk"
 * finds "Čizkejk". `đ` is a letter of its own rather than a d with a mark, so NFD
 * leaves it alone and it is mapped by hand — which is the whole reason this is a
 * function and not an inline `toLowerCase()`.
 */
function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

export function Catalog({ locale, t }: { locale: Locale; t: Messages }) {
  const [filter, setFilter] = useState<Filter>(ALL);
  const [query, setQuery] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);

  const list = useMemo(() => {
    const byFormat = filter === ALL ? PRODUCTS : PRODUCTS.filter((p) => p.formats.includes(filter));

    const needle = fold(query.trim());
    if (!needle) return byFormat;

    // Name and note, in the language on screen: someone hunting for "lemon" should
    // find the tart whether the word is in its title or in the line under it.
    return byFormat.filter((p) => fold(`${p.name[locale]} ${p.note[locale]}`).includes(needle));
  }, [filter, query, locale]);

  /**
   * The entrance plays once, when a card is first seen — Framer's
   * `whileInView once`, in eleven lines. Cards are visible without this; the
   * observer only adds the animation, so nothing waits on JavaScript to paint.
   */
  useEffect(() => {
    const root = gridRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-seen", "");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.18 },
    );
    for (const card of root.querySelectorAll("[data-card]:not([data-seen])"))
      observer.observe(card);
    return () => observer.disconnect();
  }, [list]);

  const tabs: { id: Filter; label: string }[] = [
    { id: ALL, label: t.catalog.all },
    ...FORMATS.map((f) => ({ id: f as Filter, label: t.formats[f] })),
  ];

  return (
    <Section id="catalog" tone="page">
      <Container>
        <Stack gap={10}>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-micro text-brand uppercase">{t.catalog.eyebrow}</p>
              <h2 className="text-display-lg mt-3">
                {t.catalog.title} <span className="text-brand">{t.catalog.titleAccent}</span>
              </h2>
            </div>
            {/* Two leads, because the instruction differs by input device and a
                phone has no hover to offer. */}
            <p className="text-body-sm text-content-secondary max-w-form">
              <span className="hidden md:inline">{t.catalog.lead}</span>
              <span className="md:hidden">{t.catalog.leadTouch}</span>
            </p>
          </div>
        </Stack>

        {/* Not sticky. It was, on narrow — the reference's rail — and a bar that
            detaches from the heading and rides over the cards behind a blur reads
            as a mistake rather than as help. The list is one screen of scrolling;
            the filter is where you left it. */}
        <div className="mt-8 py-1">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
            {/* Search on the left, filters on the right. They are two ways of
                narrowing the same list, so they share a row rather than stacking
                into two bars that do the same job. */}
            <label className="relative block shrink-0 lg:w-search">
              <span className="sr-only">{t.catalog.search}</span>
              <span className="text-content-secondary pointer-events-none absolute inset-y-0 left-4 flex items-center">
                <IconSearch size={16} />
              </span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t.catalog.searchPlaceholder}
                className={cx(
                  "border-line-control bg-surface-raised text-content-primary h-11 w-full rounded-pill border",
                  "pr-11 pl-11 text-body-sm placeholder:text-content-secondary transition-surface",
                  "focus-visible:border-brand focus-visible:outline-none",
                  /* The platform's own clear affordance is a grey cross that
                     ignores the palette, so it goes and ours takes its place. */
                  "[&::-webkit-search-cancel-button]:appearance-none",
                )}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label={t.catalog.searchClear}
                  className="text-content-secondary hover:text-brand absolute inset-y-0 right-3 flex items-center transition-ink"
                >
                  <IconClose size={16} />
                </button>
              )}
            </label>

            <div
              role="tablist"
              aria-label={t.catalog.filterLabel}
              /* No bleed. The rail shares its left edge with the cards below it,
                 which is the edge every other thing in the section starts from —
                 a filter that begins half a gutter to the left of the grid it
                 filters reads as a misalignment, not as a flourish. */
              className="scrollbar-none flex snap-x snap-mandatory gap-2 overflow-x-auto py-1 lg:flex-wrap lg:justify-end lg:overflow-visible"
            >
              {tabs.map((tab) => {
                const on = filter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => {
                      if (typeof navigator !== "undefined") navigator.vibrate?.(8);
                      setFilter(tab.id);
                    }}
                    className={cx(
                      "shrink-0 snap-start rounded-pill border px-5 py-2.5 text-body-sm font-semibold whitespace-nowrap",
                      "transition-surface active:scale-96",
                      on
                        ? "border-brand bg-surface-brand text-brand shadow-soft"
                        : "border-line-control bg-surface-raised text-content-secondary hover:border-brand hover:text-brand",
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      {on && (
                        <span className="badge-pop flex">
                          <IconCheck size={16} />
                        </span>
                      )}
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div ref={gridRef} className="mt-10">
          {list.length === 0 ? (
            <div className="border-line rounded-card grid place-items-center gap-2 border border-dashed py-20 text-center">
              <p className="text-body text-content-primary">
                {query.trim() ? t.catalog.emptySearch : t.catalog.empty}
              </p>
              <p className="text-body-sm text-content-secondary">
                {query.trim() ? t.catalog.emptySearchHint : t.catalog.emptyHint}
              </p>
            </div>
          ) : (
            <Grid cols={3} fromTwo gap={6}>
              {list.map((product, i) => (
                <ProductCard
                  key={product.slug}
                  product={product}
                  index={i}
                  locale={locale}
                  t={t}
                  /* The catalogue is below the fold at every width, so nothing here
                     is the LCP element and nothing here is eager. */
                  priority={false}
                />
              ))}
            </Grid>
          )}
        </div>
      </Container>
    </Section>
  );
}
