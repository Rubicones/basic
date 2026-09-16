"use client";

import { type FormEvent, type ReactNode } from "react";
import {
  Button,
  Card,
  Container,
  IconAlert,
  IconArrowRight,
  IconBag,
  IconCard,
  IconCheck,
  IconClock,
  IconClose,
  Input,
  Media,
  Section,
  Select,
  Stepper,
  Textarea,
} from "@/components/ui";
import { cx } from "@/components/ui/cx";
import { BlobMark } from "@/components/brand/blob-mark";
import { photoFor } from "@/lib/catalog/photos";
import { cartTotal, type CartLine } from "@/lib/order/cart";
import { useCart } from "@/lib/cart/context";
import { ORDER_FIELDS, fieldText, type OrderField } from "@/lib/order/fields";
import type { Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/dictionaries";
import { fill, formatPrice, plural } from "@/lib/i18n/format";

/**
 * The order screen: the customer's details, the box they have filled, and the
 * button that will one day send both.
 *
 * Two things are deliberately absent, because the brief puts them out of scope
 * for this phase: the cart is not connected to the catalog, and the form does not
 * submit. Both have a seam. `lines` is the shape the cart work will produce, and
 * `status` is the union the submit work will drive — every state each of them can
 * be in is built and reviewable now.
 *
 * The layout difference from the reference is the one that matters: form and cart
 * are a single `<form>`, and the cart is above the submit button in source order
 * at every width. The reference made them grid siblings, which put the button
 * before the lines it totalled on anything narrower than `lg` — and then repeated
 * the total inside the button's label to paper over it.
 */

export type OrderStatus = "idle" | "busy" | "sent" | "failed";

type Props = {
  locale: Locale;
  t: Messages;
  /** Driven by the submit wiring later; every branch is rendered from it today. */
  status?: OrderStatus;
};

export function Order({ locale, t, status = "idle" }: Props) {
  // The same cart the cards add to — see src/lib/cart/context.tsx.
  const { lines, total, setQty, clear } = useCart();
  const empty = lines.length === 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Submission is the next phase. Preventing the default keeps the page from
    // navigating in the meantime; nothing here pretends to have sent anything.
    event.preventDefault();
  }

  return (
    <Section
      id="order"
      tone="sunken"
      labelledBy="order-title"
      decoration={
        <div className="text-brand/10 absolute -bottom-40 -left-32 size-120">
          <BlobMark fill />
        </div>
      }
    >
      <Container>
        <div className="max-w-measure">
          <h2 id="order-title" className="text-display-lg">
            {t.order.title} <span className="text-brand">{t.order.titleAccent}</span>
          </h2>
          <p className="text-body text-content-secondary mt-5">{t.order.lead}</p>
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Note icon={<IconClock size={16} />}>{t.order.urgent}</Note>
          <Note icon={<IconCard size={16} />}>{t.order.deferred}</Note>
        </div>

        <form onSubmit={handleSubmit} className="mt-12 grid gap-8 lg:grid-cols-order">
          {/* The box comes first in the DOM at every width, so the total is always
              read before the button that sends it. On `lg` the grid puts it in the
              second column and it sticks under the header — the reference's layout,
              without the reference's source order. */}
          <div className="lg:col-start-2 lg:row-start-1 lg:sticky lg:top-header lg:self-start">
            <CartPanel locale={locale} t={t} lines={lines} onQty={setQty} onClear={clear} />
          </div>

          <div className="lg:col-start-1 lg:row-start-1">
            <Card padding="lg">
              <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                {ORDER_FIELDS.map((field) => (
                  <OrderControl key={field.key} field={field} t={t} />
                ))}
              </div>

              <div className="mt-7 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <Button
                  type="submit"
                  size="lg"
                  fullWidth="untilSm"
                  disabled={empty}
                  loading={status === "busy"}
                  loadingLabel={t.order.sending}
                  iconEnd={<IconArrowRight size={20} />}
                >
                  {empty
                    ? t.order.submit
                    : fill(t.order.submitTotal, { total: formatPrice(locale, total) })}
                </Button>

                {empty && status === "idle" && (
                  <p className="text-body-sm text-content-secondary">{t.order.submitHint}</p>
                )}
              </div>

              {/* One region for the outcome. The reference had two bare paragraphs,
                  neither announced, the failure carried by colour alone. */}
              <div role="status" aria-live="polite" className="empty:hidden">
                {status === "sent" && (
                  <p className="text-body-sm text-success mt-5 flex items-start gap-2 font-medium">
                    <span className="mt-0.5 shrink-0">
                      <IconCheck size={16} />
                    </span>
                    {t.order.sent}
                  </p>
                )}
              </div>
              {status === "failed" && (
                <p
                  role="alert"
                  className="text-body-sm text-danger mt-5 flex items-start gap-2 font-medium"
                >
                  <span className="mt-0.5 shrink-0">
                    <IconAlert size={16} />
                  </span>
                  {t.order.failed}
                </p>
              )}
            </Card>
          </div>
        </form>
      </Container>
    </Section>
  );
}

/** A fact about ordering, stated where the question comes up. */
function Note({ children, icon }: { children: ReactNode; icon: ReactNode }) {
  return (
    <p className="border-brand/15 bg-surface-brand/45 text-content-secondary text-body-sm flex items-center gap-2.5 rounded-pill border px-4 py-2.5">
      <span className="text-brand shrink-0">{icon}</span>
      {children}
    </p>
  );
}

/**
 * One field, from the config.
 *
 * Each control owns its own label, hint and error wiring — that is the whole
 * reason the kit's controls take `label` and `help` as props instead of being
 * wrapped in a hand-written `<label>` the way the reference wrapped them.
 */
function OrderControl({ field, t }: { field: OrderField; t: Messages }) {
  const text = fieldText(t, field.key);

  if (field.control === "textarea") {
    return (
      <Textarea
        name={field.key}
        label={text.label}
        {...(text.placeholder ? { placeholder: text.placeholder } : {})}
        {...(text.help ? { help: text.help } : {})}
        required={field.required}
        rows={field.rows}
        wide={field.wide}
      />
    );
  }

  if (field.control === "select") {
    return (
      <Select
        name={field.key}
        label={text.label}
        {...(text.placeholder ? { placeholder: text.placeholder } : {})}
        {...(text.help ? { help: text.help } : {})}
        required={field.required}
        wide={field.wide}
        options={t.delivery.cities.map((city) => ({ value: city.slug, label: city.name }))}
      />
    );
  }

  return (
    <Input
      name={field.key}
      label={text.label}
      type={field.type}
      {...(field.autoComplete ? { autoComplete: field.autoComplete } : {})}
      {...(text.placeholder ? { placeholder: text.placeholder } : {})}
      {...(text.help ? { help: text.help } : {})}
      required={field.required}
      wide={field.wide}
    />
  );
}

function CartPanel({
  locale,
  t,
  lines,
  onQty,
  onClear,
}: {
  locale: Locale;
  t: Messages;
  lines: readonly CartLine[];
  onQty: (key: string, next: number) => void;
  onClear: () => void;
}) {
  const total = cartTotal(lines);

  return (
    <Card>
      <div className="flex items-center gap-3">
        <span className="text-brand">
          <IconBag size={20} />
        </span>
        <h3 className="text-title font-extrabold">{t.order.cartTitle}</h3>
      </div>

      {lines.length === 0 ? (
        <p className="text-body-sm text-content-secondary mt-6">{t.order.cartEmpty}</p>
      ) : (
        <>
          {/* A list of things is a list. The reference had divs, so nothing
              announced how many lines there were or that one had gone. */}
          <ul aria-label={t.order.cartItems} className="divide-line mt-6 divide-y">
            {lines.map((line) => (
              <CartRow key={line.key} line={line} locale={locale} t={t} onQty={onQty} />
            ))}
          </ul>

          <div className="border-line mt-6 flex items-baseline justify-between gap-4 border-t pt-5">
            <span className="text-body-sm text-content-secondary">{t.order.total}</span>
            <output className="font-display text-display-sm text-brand font-bold tabular-nums">
              {formatPrice(locale, total)}
            </output>
          </div>

          <div className="mt-4">
            <Button variant="ghost" size="sm" onClick={onClear} iconStart={<IconClose size={16} />}>
              {t.order.clear}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

function CartRow({
  line,
  locale,
  t,
  onQty,
}: {
  line: CartLine;
  locale: Locale;
  t: Messages;
  onQty: (key: string, next: number) => void;
}) {
  const photo = photoFor(line.product.slug);
  const name = line.product.name[locale];
  // A whole cake is a different thing to order, not a suffix bolted onto a
  // translated name — so the whole label is one message with one placeholder.
  const label = line.variant === "whole" ? fill(t.order.lineWhole, { name }) : name;

  return (
    <li className="line-reveal">
      <div>
        <div className="flex items-center gap-4 py-4">
          <div className="w-14 shrink-0">
            <Media
              src={photo.src}
              alt=""
              sizes="56px"
              ratio="square"
              rounded="inner"
              {...(photo.blurDataURL ? { blurDataURL: photo.blurDataURL } : {})}
            />
          </div>

          <div className="min-w-0 flex-1">
            {/* No truncation: at 390 px the stepper and the thumbnail leave about
                130 px here, and a clipped "New York ch…" is not a thing anyone can
                confirm they ordered. It wraps instead. */}
            <p className="font-display text-body-sm font-bold">{label}</p>
            <p className="text-caption text-content-secondary">
              {fill(t.order.each, { price: formatPrice(locale, line.unitPrice) })}
            </p>
          </div>

          <Stepper
            value={line.qty}
            onDecrement={() => onQty(line.key, line.qty - 1)}
            onIncrement={() => onQty(line.key, line.qty + 1)}
            decrementLabel={fill(t.order.removeOne, { name: label })}
            incrementLabel={fill(t.order.addOne, { name: label })}
            valueLabel={fill(t.order.lineQuantity, { name: label })}
            min={0}
          />
        </div>
      </div>
    </li>
  );
}

/**
 * The order bar on touch widths.
 *
 * It clears the home indicator, and it reserves its own height in the flow so it
 * cannot cover the last row above it — the reference's did neither. It is hidden
 * from `lg`, where the sticky cart column takes over; the reference hid it at
 * `md` and brought the column in at `lg`, leaving a band of widths with no
 * persistent way back to the order.
 */
export function OrderBar({ locale, t }: { locale: Locale; t: Messages }) {
  const { count, total } = useCart();
  if (count === 0) return null;

  return (
    <>
      <div aria-hidden="true" className="h-order-bar lg:hidden" />
      <div className="pb-safe fixed inset-x-0 bottom-0 z-40 px-4 lg:hidden">
        <a
          href="#order"
          aria-label={t.order.barLabel}
          className={cx(
            "bg-brand text-content-on-brand shadow-lift flex items-center justify-between gap-3",
            "rounded-pill px-5 py-4 transition-control active:translate-y-px",
          )}
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="bg-surface-inverse grid size-9 shrink-0 place-items-center rounded-pill">
              <IconBag size={16} />
            </span>
            <span className="font-display truncate text-body font-bold">
              {fill(t.order.barSummary, {
                count: plural(locale, count, t.units.pieces),
                total: formatPrice(locale, total),
              })}
            </span>
          </span>
          <span className="font-display text-body-sm flex shrink-0 items-center gap-1.5 font-bold">
            {t.order.barCheckout}
            <IconArrowRight size={16} />
          </span>
        </a>
      </div>
    </>
  );
}
