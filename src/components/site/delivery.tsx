"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  Container,
  Grid,
  IconCalendar,
  IconChevronDown,
  IconClock,
  IconPin,
  IconTruck,
  Section,
  Tile,
} from "@/components/ui";
import { cx } from "@/components/ui/cx";
import type { Messages } from "@/lib/i18n/dictionaries";

/**
 * Delivery terms, one card per city.
 *
 * The reveal is `grid-template-rows: 0fr → 1fr` rather than the reference's
 * animated `height: auto`, so opening a card does not lay out the page under it.
 * The figures are a `<dl>` — a minimum order is a value for a label, not the
 * `<strong>` the reference wrapped it in.
 */

export function Delivery({ t }: { t: Messages }) {
  return (
    <Section id="delivery" tone="page" size="compact" labelledBy="delivery-title">
      <Container>
        <div className="max-w-measure">
          <p className="text-micro text-brand uppercase">{t.delivery.eyebrow}</p>
          <h2 id="delivery-title" className="text-display-lg mt-3">
            {t.delivery.title} <span className="text-brand">{t.delivery.titleAccent}</span>
          </h2>
          <p className="text-body text-content-secondary mt-4">{t.delivery.lead}</p>
        </div>

        <div className="mt-10">
          <Grid cols={2} gap={5} align="start">
            {t.delivery.cities.map((city) => (
              <CityCard key={city.slug} city={city} t={t} />
            ))}
          </Grid>
        </div>
      </Container>
    </Section>
  );
}

function CityCard({ city, t }: { city: Messages["delivery"]["cities"][number]; t: Messages }) {
  const [open, setOpen] = useState(false);
  const panelId = `delivery-${city.slug}`;

  return (
    <Card padding="none">
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h3 className="text-display-sm">{city.name}</h3>
          <Badge tone="brand" caps={false} iconStart={<IconPin size={16} />}>
            {t.delivery.area}
          </Badge>
        </div>

        {/* A description list: each figure is a value for its label. */}
        <dl className="grid grid-cols-2 gap-3">
          <Tile>
            <dt className="text-micro text-content-secondary flex items-center gap-1.5 uppercase">
              <span className="text-brand">
                <IconCalendar size={16} />
              </span>
              {t.delivery.minimum}
            </dt>
            <dd className="font-display text-body-lg mt-2 font-bold">{city.minimum}</dd>
          </Tile>

          <Tile>
            <dt className="text-micro text-content-secondary flex items-center gap-1.5 uppercase">
              <span className="text-brand">
                <IconTruck size={16} />
              </span>
              {t.delivery.fee}
            </dt>
            <dd className="font-display text-body-sm mt-2 leading-tight font-bold">{city.fee}</dd>
          </Tile>

          <div className="col-span-2">
            <div className="bg-surface-brand/45 text-content-primary flex items-center gap-3 rounded-inner px-4 py-3">
              <span className="text-brand shrink-0">
                <IconClock size={16} />
              </span>
              <dt className="sr-only">{t.delivery.schedule}</dt>
              <dd className="text-body-sm">{city.schedule}</dd>
            </div>
          </div>
        </dl>

        <div className="mt-4">
          <Button
            variant="ghost"
            fullWidth
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={panelId}
            iconEnd={
              <span
                className={cx(
                  "flex transition-transform duration-base ease-out-smooth",
                  open && "rotate-180",
                )}
              >
                <IconChevronDown size={16} />
              </span>
            }
          >
            {open ? t.delivery.less : t.delivery.more}
          </Button>
        </div>
      </div>

      <div
        id={panelId}
        data-open={open || undefined}
        className="panel-reveal border-line bg-surface-brand/25 border-t"
      >
        <div>
          <ul className="text-body-sm text-content-secondary space-y-3 px-6 py-5">
            {city.details.map((detail) => (
              <li key={detail} className="flex gap-3">
                <span aria-hidden="true" className="bg-brand mt-2 size-1.5 shrink-0 rounded-pill" />
                {detail}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
