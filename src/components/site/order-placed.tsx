"use client";

import { useEffect, useRef, useState } from "react";
import { BlobMark } from "@/components/brand/blob-mark";
import { Button, Card, IconAlert, IconCheck, IconClock } from "@/components/ui";
import { COMPANY } from "@/lib/legal/company";
import { fill, formatPrice } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/dictionaries";

/**
 * What replaces the form once an order is in.
 *
 * The order is already on the server, held for a minute (migration 0013). Until
 * the minute is up the card offers to take it back — the customer lands on the
 * form exactly as they filled it. After that the database has handed it to the
 * shop, whether or not this tab is still open; the card only reflects it.
 */

export type PlacedOrder = {
  id: string;
  token: string;
  /** Epoch ms when the server releases it to the shop. */
  releaseAt: number;
  details: { label: string; value: string }[];
  lines: { key: string; name: string; qty: number; sum: number }[];
  total: number;
};

type Props = {
  order: PlacedOrder;
  locale: Locale;
  t: Messages;
  /** Resolves true when the order was taken back and the form can reopen. */
  onFix: () => Promise<boolean>;
  /** The minute is over — the parent clears the cart and the form. */
  onReleased: () => void;
  onAnother: () => void;
};

export function OrderPlaced({ order, locale, t, onFix, onReleased, onAnother }: Props) {
  const o = t.order;
  const left = useSecondsLeft(order.releaseAt);
  const released = left === 0;
  const [fixing, setFixing] = useState(false);
  const [fixFailed, setFixFailed] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  // Focus lands on the result, so a screen reader hears it and a keyboard user
  // is not left on a button that no longer exists.
  useEffect(() => heading.current?.focus(), []);

  const reported = useRef(false);
  useEffect(() => {
    if (released && !reported.current) {
      reported.current = true;
      onReleased();
    }
  }, [released, onReleased]);

  async function fix() {
    setFixing(true);
    setFixFailed(false);
    const ok = await onFix();
    if (!ok) {
      setFixing(false);
      setFixFailed(true);
    }
  }

  return (
    <Card padding="lg">
      <div className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="text-brand/10 pointer-events-none absolute -top-6 -right-6 size-32"
        >
          <BlobMark fill />
        </div>

        <span className="bg-surface-brand text-brand grid size-12 place-items-center rounded-pill">
          <IconCheck size={24} />
        </span>
        <h3 ref={heading} tabIndex={-1} className="text-display-sm mt-5 outline-none">
          {o.placedTitle}
        </h3>
        <p className="text-body text-content-secondary mt-2" role="status" aria-live="polite">
          {released ? o.placedReleased : o.placedLead}
        </p>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <section aria-labelledby="placed-items">
          <h4 id="placed-items" className="text-micro text-brand uppercase">
            {o.placedItems}
          </h4>
          <ul className="text-body-sm mt-3 space-y-2">
            {order.lines.map((line) => (
              <li key={line.key} className="flex items-baseline justify-between gap-3">
                <span className="min-w-0">
                  {line.name}{" "}
                  <span className="text-content-secondary tabular-nums">× {line.qty}</span>
                </span>
                <span className="shrink-0 font-bold tabular-nums">
                  {formatPrice(locale, line.sum)}
                </span>
              </li>
            ))}
          </ul>
          <p className="border-line text-body mt-3 flex justify-between border-t pt-3 font-bold">
            <span>{o.total}</span>
            <span className="tabular-nums">{formatPrice(locale, order.total)}</span>
          </p>
        </section>

        <section aria-labelledby="placed-details">
          <h4 id="placed-details" className="text-micro text-brand uppercase">
            {o.placedDetails}
          </h4>
          <dl className="text-body-sm mt-3 space-y-2">
            {order.details.map((row) => (
              <div key={row.label}>
                <dt className="text-content-secondary text-caption">{row.label}</dt>
                <dd className="font-medium break-words whitespace-pre-line">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <div className="border-line mt-8 border-t pt-6">
        {released ? (
          <Button variant="outline" onClick={onAnother}>
            {o.placedAnother}
          </Button>
        ) : (
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Button variant="outline" onClick={fix} loading={fixing} loadingLabel={o.placedFixing}>
              {o.placedFix}
            </Button>
            <p className="text-caption text-content-secondary flex items-center gap-1.5">
              <IconClock size={16} />
              <span className="tabular-nums">{fill(o.placedWindow, { time: clock(left) })}</span>
            </p>
          </div>
        )}

        {fixFailed && (
          <p
            role="alert"
            className="text-body-sm text-danger mt-4 flex items-start gap-2 font-medium"
          >
            <span className="mt-0.5 shrink-0">
              <IconAlert size={16} />
            </span>
            {fill(o.placedFixFailed, { phone: COMPANY.phone })}
          </p>
        )}
      </div>
    </Card>
  );
}

function useSecondsLeft(deadline: number): number {
  const [now, setNow] = useState(() => Date.now());
  const left = Math.max(0, Math.ceil((deadline - now) / 1000));
  useEffect(() => {
    if (left === 0) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [left === 0]); // eslint-disable-line react-hooks/exhaustive-deps
  return left;
}

function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
