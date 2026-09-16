"use client";

import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from "react";
import { PRODUCTS, WHOLE_MULTIPLIER, type Product } from "@/lib/catalog/products";
import { lineKey, type CartLine, type Variant } from "@/lib/order/cart";

/**
 * One cart for the whole page.
 *
 * It used to be a `qty` inside each card, which meant the card could count but
 * nobody else could hear it — the order panel and the mobile bar had no way to
 * know anything had been added. This is the reference's arrangement: the page
 * owns a `{ "slug:variant": qty }` record, and every part that adds, removes,
 * totals or displays reads the same one.
 *
 * Context rather than a store: the state is one object and three operations, and
 * a dependency would be carrying a library to do `useReducer`'s job.
 *
 * Nothing is persisted, by design. A cart that survives a reload also survives a
 * price change, and this one is priced from `PRODUCTS` on every render.
 */

type CartState = Record<string, number>;

type Action =
  | { type: "add"; key: string }
  | { type: "remove"; key: string }
  | { type: "set"; key: string; qty: number }
  | { type: "clear" };

function reducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case "add":
      return { ...state, [action.key]: (state[action.key] ?? 0) + 1 };

    case "remove":
    case "set": {
      const next = action.type === "remove" ? (state[action.key] ?? 0) - 1 : action.qty;
      if (next > 0) return { ...state, [action.key]: next };
      // A line at zero is a line that is gone, not a line holding a zero —
      // otherwise the cart keeps a row the customer emptied.
      const rest = { ...state };
      delete rest[action.key];
      return rest;
    }

    case "clear":
      return {};
  }
}

type CartValue = {
  /** Quantity of one product in one variant. */
  qtyOf: (slug: string, variant: Variant) => number;
  add: (slug: string, variant: Variant) => void;
  remove: (slug: string, variant: Variant) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
  /** Resolved against the catalogue, in catalogue order. */
  lines: CartLine[];
  count: number;
  total: number;
};

const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {});

  const qtyOf = useCallback(
    (slug: string, variant: Variant) => state[lineKey(slug, variant)] ?? 0,
    [state],
  );

  const add = useCallback(
    (slug: string, variant: Variant) => dispatch({ type: "add", key: lineKey(slug, variant) }),
    [],
  );
  const remove = useCallback(
    (slug: string, variant: Variant) => dispatch({ type: "remove", key: lineKey(slug, variant) }),
    [],
  );
  const setQty = useCallback((key: string, qty: number) => dispatch({ type: "set", key, qty }), []);
  const clear = useCallback(() => dispatch({ type: "clear" }), []);

  const lines = useMemo(() => resolve(state), [state]);
  const count = useMemo(() => lines.reduce((sum, line) => sum + line.qty, 0), [lines]);
  const total = useMemo(
    () => lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0),
    [lines],
  );

  const value = useMemo(
    () => ({ qtyOf, add, remove, setQty, clear, lines, count, total }),
    [qtyOf, add, remove, setQty, clear, lines, count, total],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside <CartProvider>.");
  return value;
}

/**
 * Cart keys back into products, in catalogue order rather than the order things
 * were tapped — the panel should read like the catalogue it was filled from.
 */
function resolve(state: CartState): CartLine[] {
  const bySlug = new Map<string, Product>(PRODUCTS.map((product) => [product.slug, product]));
  const lines: CartLine[] = [];

  for (const product of PRODUCTS) {
    for (const variant of ["piece", "whole"] as const) {
      const key = lineKey(product.slug, variant);
      const qty = state[key];
      if (!qty) continue;

      const source = bySlug.get(product.slug);
      if (!source) continue;

      lines.push({
        key,
        product: source,
        variant,
        qty,
        unitPrice: variant === "whole" ? source.price * WHOLE_MULTIPLIER : source.price,
      });
    }
  }

  return lines;
}
