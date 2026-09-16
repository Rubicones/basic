# Screen 4 — order form, cart and mobile bar

Reviewed before rebuilding: `src/components/OrderForm.tsx`, `src/components/MobileOrderBar.tsx`
and `src/components/OrderConditions.tsx` in the reference.

Scope note: the brief puts **cart logic and form submission out of scope**. What is
built here is the interface and every one of its states, with the seams the later
wiring will drive. Nothing is sent anywhere and nothing persists.

## Markup faults found

### The form

1. **Nothing is wired for assistive tech.** A single `field` class string is pasted onto
   `<input>`, `<textarea>` and `<select>`; not one control has `aria-describedby`,
   `aria-invalid`, an id, or per-field error text. The form has exactly one error
   message, at the bottom, attached to nothing.
2. **Help text lives inside the `<label>`.** `{f.help}` is a `<span>` inside the label
   element, so a screen reader reads the hint as part of the field's name — every time
   the field is focused, forever.
3. **The submit button's accessible name is its state.** It reads "Add a dessert first"
   when the cart is empty and `Send order · 4.200 RSD` when it is not. A control whose
   name changes under the user is a different control to anyone not looking at it, and
   a disabled button announces nothing at all — so the reason it is disabled is invisible
   to exactly the people who need it.
4. **`disabled:opacity-40` on a solid fill.** The same failure the kit already fixed for
   `Button`: fading fill and label together composites both toward the page, and the
   label measured 2.60:1.
5. **Success and failure are `<p>` with no live region.** Neither is announced. The
   failure is `text-destructive` only — colour as the sole carrier of meaning, 1.4.1.
6. **The button repeats the total because the layout separated them.** Form and cart are
   grid siblings, so below `lg` the submit button renders *above* the cart lines it
   totals. The duplicated figure in the label is a patch over the ordering.
7. **`applyParser` normalises on the client and nowhere else** — `trim`, `toLowerCase`,
   a phone regex. Input shaping that the server must redo anyway.
8. **Arbitrary values and alpha tints**: `rounded-[2rem]`, `text-[0.7rem]`,
   `tracking-[0.16em]`, `border-ink/15`, `bg-accent/45`, `border-primary/15`.

### The cart

9. **A list of items is not a list.** `<div>` of `<div>`s; the quantity is a bare
   `<span>`. Nothing tells a screen reader how many lines there are or that one left.
10. **`height: 0 → auto` plus `layout`** on every line — the layout-thrashing reveal
    again, this time on a list that changes while the user watches.
11. **The ± buttons are `size-7` — 28 px.** Below 2.5.5's 44 px, and the pair sit 8 px
    apart on a phone.
12. **The total is re-mounted to animate it** (`key={total}`). Remounting a text node on
    every change is an unreliable way to get it announced and a certain way to lose the
    selection; there is no live region either.
13. **`formatPrice` is one hardcoded format** for all three languages.

### The mobile bar

14. **No safe-area inset.** `fixed inset-x-0 bottom-0 … pb-5` puts the bar under the iOS
    home indicator.
15. **Nothing reserves space for it.** It is `fixed` over content with no compensating
    padding, so it covers the last row of the catalog.
16. **It disappears at `md`, the sticky cart appears at `lg`.** Between those two there
    is no persistent way to reach the order.
17. **The count badge is `key={count}` remounted text** inside the link's name, so the
    link's accessible name changes on every tap.

### Duplication

18. **`OrderConditions` is a second copy of the delivery screen** already rebuilt as
    screen 3 — same two cities, same figures, same disclosure. It is not rebuilt again.
19. **The two chips above the form** ("Urgent orders by arrangement", "Payment in 10 days
    may be arranged") repeat facts the delivery cards already list. They are kept, because
    they answer the question at the moment it is asked, but the wording now comes from the
    same message keys so the two places cannot drift.

## What the rebuild does

- Every control is the kit's `Input` / `Select` / `Textarea`, which own their label, help
  and error and wire `aria-describedby` / `aria-invalid` themselves. Help text is a
  sibling of the label, not inside it.
- The submit button keeps one name. When the order is empty the button is disabled and a
  sentence beside it says why — visible, and in the accessibility tree.
- Form and cart are one `<form>`: the cart panel is inside it, above the submit button in
  source order at every width, so the total always precedes the button that sends it.
  On `lg` the panel is a sticky column via `order` — visual order changes, DOM order
  does not.
- The cart is a `<ul>`; each line's quantity is an `<output>`. Line removal and the total
  are announced through one polite live region, not four.
- Lines reveal with `grid-template-rows: 0fr → 1fr`, the same utility the card and the
  delivery panel use.
- The quantity stepper moved into the kit — it had been written once in the product
  card and once here, which is the usual sign. The pill is 44 px tall and its two
  buttons are 36 px, clearing 2.5.8 with room; the value inside it is an `<output>`,
  so a change announces itself without a live region wrapped around the row.
- Cart line names wrap rather than truncate: at 390 px the column is ~130 px wide, and
  "New York ch…" is not something anyone can confirm they ordered.
- Form state is a `status` union — `idle | busy | sent | error` — rendered by the view and
  driven by nothing yet. `busy` uses `Button loading`, `sent` and `error` land in an
  `role="status"` / `role="alert"` region.
- The mobile bar sits above `env(safe-area-inset-bottom)`, the page reserves its height,
  and it is shown below `lg` so it covers the gap where the sticky column is absent.
- The field set is a typed config in `src/lib/order/fields.ts` whose shape is the one the
  admin panel will serve later, with labels in the dictionaries — so translating a field
  and adding a field stay separate jobs.

## Second pass — brought back to the reference

Compared side by side with the reference, the rebuild had drifted on surface and
proportion. What changed, and what did not.

**Order screen**

- Section surface is `cream-deep` (`tone="sunken"`), not the page cream, and the mark
  washes out of the bottom-left corner at 30 rem / 10% brand — the reference's
  `BlobMark`. `Section` gained a `decoration` slot for inert artwork behind content.
- The invented eyebrow ("Ordering") and the invented "Your details" legend are gone;
  the reference goes straight from the heading to the fields.
- The submit button is back inside the form card, full width up to `sm`, as in the
  reference. The DOM fix survives it: the box now comes **before** the card in source
  order, and the grid puts it in column two on `lg`. Same picture, correct order.
- Card padding is the reference's `p-6 sm:p-9` (`Card padding="lg"`), field grid is
  `gap-x-4 gap-y-5`, the box heading is 20 px rather than the 24 px section size.
- The chips are a 45% wash of the accent with a 15% brand hairline and muted text,
  not a solid fill — the reference's treatment.

**Delivery screen**

- Section surface is the page cream, not raised, so the cards read as white on cream.
- The "Delivery area" pill is sentence case on a 65% accent (`Badge caps={false}`).
- Tiles are a near-white wash (`surface-page/65`) instead of the peach `surface-sunken`;
  the schedule strip is 45% accent and the disclosure panel 25%.
- Figures are 18 px and 14 px display type, not 20 px and body weight.
- `Grid` gained `align="start"` so opening one city's details no longer stretches the
  other card to match — the reference's `items-start`.

**Third pass — focus and the disabled CTA**, both on Dmitry's call:

- A focused text control takes a brand-coloured border and no ring, as the reference
  had it. This is the one exception to "focus is never removed" — buttons, links, the
  stepper and the checkbox all keep the global 2 px ring. The indicator is a border
  colour change from `line-control` to `brand`, which is visible but weaker than a ring.
- The disabled `solid` / `solidWipe` button keeps the clay fill at 40 % opacity instead
  of the fixed sunken surface. Fading fill and label together puts the label near
  2.6:1. The non-brand variants (`outline`, `ghost`, `danger`) still use the fixed
  surface, which measures 5.93:1.

**Not brought back**, and why:

- Required fields keep their marker, and the control border keeps `line-control`
  (3.05:1 vs the reference's 1.27:1) — both are phase-2 decisions the palette review
  already settled.
- The extra two delivery bullets (deferred payment, invoice with VAT) stay: they are
  the client's own terms from the deck, not reference design.

**Icons** are now the reference's set traced stroke for stroke — `ShoppingBag`,
`Clock3`, `CreditCard`, `CalendarDays`, `Truck`, `MapPin`, `ArrowRight` — rather than
approximations of them.

## The cart, wired

The mobile bar could never appear, because nothing fed it: `qty` lived inside each
product card, so the card could count but nobody else could hear it. This is the
reference's arrangement, rebuilt on our stack.

The page owns one cart — a `{ "slug:variant": qty }` record — and the catalogue cards,
the order panel and the bar all read and write that one. In the reference it is a
`useState` in the route component passed down as props; here the page is a server
component, so it is a client `CartProvider` around the sections, with `useReducer`
inside. Context rather than a store: this is one object and four operations, and a
dependency would be carrying a library to do `useReducer`'s job.

The bar is rendered last inside `<main>`, not inside the order section. It is `fixed`,
so it belongs to the page rather than to one section of it — the same reason the
reference mounts it beside the footer.

Nothing is persisted, matching the reference. A cart that survives a reload also
survives a price change, and lines here are priced from `PRODUCTS` on every render.

Still out of scope, and still true: the form does not submit.
