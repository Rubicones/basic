import type { Product } from "@/lib/catalog/products";

/**
 * What the order panel renders.
 *
 * The cart itself — how a card's stepper reaches this, where it is stored, how it
 * survives a reload — is out of scope for this phase. This is the shape that work
 * will produce, so the panel can be built and reviewed against it now.
 */

export type Variant = "piece" | "whole";

export type CartLine = {
  /** Stable across re-renders: one product may appear as both a piece and a cake. */
  key: string;
  product: Product;
  variant: Variant;
  qty: number;
  /** Resolved when the line was added, so a later price change cannot silently
      restate an order the customer has already seen. */
  unitPrice: number;
};

export function lineKey(slug: string, variant: Variant): string {
  return `${slug}:${variant}`;
}

export function cartTotal(lines: readonly CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.unitPrice * line.qty, 0);
}

export function cartCount(lines: readonly CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.qty, 0);
}
