# Screen 3 — delivery conditions

Reviewed before rebuilding: `src/components/OrderConditions.tsx` in the reference.

## Markup faults found

1. **`height: 0 → auto` is animated** on the details panel — the same layout-thrashing
   reveal as the product card. Every frame lays out the card and everything under it.
2. **The panel id is built with `.replace(" ", "-")`**, which replaces the first space only.
   It happens to work for "Novi Sad"; a third city with two spaces would produce a
   malformed id and silently break `aria-controls`.
3. **The facts are `<strong>`.** A minimum order of 3.000 RSD is a value for a label, not
   emphasised prose. Screen readers get "strong" where they should get a term and its
   definition.
4. **Alpha on palette colors everywhere** — `bg-background/65`, `bg-accent/45`,
   `bg-accent/25`, `bg-accent/65`. Four tints of one accent inside one component.
5. **Arbitrary values**: `text-[0.68rem]`, `tracking-[0.14em]`, `rounded-[1.75rem]` — a
   fourth micro size and a third tracking, for a label the rest of the site already had.
6. **The two cards are peers with different content shapes.** Belgrade has a pickup
   discount that Novi Sad does not; both are forced through the same two-tile grid, so
   Belgrade's extra fact is demoted into the collapsed list where nobody reads it.
7. **The only use of the shadcn `<Button>` in the entire application** is the disclosure
   toggle here — a 45-file dependency layer carried for one control.
8. `aria-labelledby` on the section is correct and carries over.

## What the rebuild does

- The reveal is `grid-template-rows: 0fr → 1fr`, matching the product card, so the
  panel opens on the compositor instead of laying out the page.
- The facts are a `<dl>`: each figure is a `<dd>` under its `<dt>`.
- Ids come from a slug in the data, not from transforming a display name.
- Two cities are a typed, localised fixture rather than a hardcoded English array.
- The kit's `Button variant="ghost"`, `Card` and `Tile` do the work; nothing new was
  needed beyond four icons.
- Copy is the reference's, which is itself the deck's terms, translated into all three.
