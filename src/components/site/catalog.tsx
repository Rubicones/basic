"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Container, Grid, IconCheck, Section, Stack } from "@/components/ui";
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
 * differences that were real (a snapping rail on narrow, a column switcher on
 * wide) are breakpoints, and the ones that were accidental are gone.
 *
 * The filter is by storage format, because that is the question a venue actually
 * asks: a café with no display case needs to see only what survives on a counter.
 * A product can be in several groups at once — the New York cheesecake is in three
 * — which the reference's single-category model could not express.
 */

const ALL = "all" as const;
type Filter = typeof ALL | Format;
type Columns = 3 | 4 | 5;

export function Catalog({ locale, t }: { locale: Locale; t: Messages }) {
  const [filter, setFilter] = useState<Filter>(ALL);
  const [columns, setColumns] = useState<Columns>(3);
  const gridRef = useRef<HTMLDivElement>(null);

  const list = useMemo(
    () => (filter === ALL ? PRODUCTS : PRODUCTS.filter((p) => p.formats.includes(filter))),
    [filter],
  );

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
          <div className="flex items-center justify-between gap-4">
            <div
              role="tablist"
              aria-label={t.catalog.filterLabel}
              /* The rail still runs to the edge of the screen — a horizontally
                 scrolling strip that stops short of it looks broken. */
              className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 py-1 sm:-mx-5 sm:px-5 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0"
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

            <ColumnSwitcher value={columns} onChange={setColumns} />
          </div>
        </div>

        <div ref={gridRef} className="mt-10">
          {list.length === 0 ? (
            <div className="border-line rounded-card grid place-items-center gap-2 border border-dashed py-20 text-center">
              <p className="text-body text-content-primary">{t.catalog.empty}</p>
              <p className="text-body-sm text-content-secondary">{t.catalog.emptyHint}</p>
            </div>
          ) : (
            <Grid cols={columns} fromTwo gap={6}>
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

/** Desktop only: the reference's 3 / 4 / 5 density control. */
function ColumnSwitcher({ value, onChange }: { value: Columns; onChange: (c: Columns) => void }) {
  return (
    <div className="border-line-control hidden items-center gap-1 rounded-pill border p-1 xl:flex">
      {([3, 4, 5] as const).map((n) => (
        <button
          key={n}
          type="button"
          aria-pressed={value === n}
          onClick={() => onChange(n)}
          className={cx(
            "font-display grid size-9 place-items-center rounded-pill text-body-sm font-bold transition-surface",
            value === n
              ? "bg-brand text-content-on-brand"
              : "text-content-secondary hover:text-brand",
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
