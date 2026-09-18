# Screen 2 — catalog

Reviewed before rebuilding: `Catalog.tsx` (120 lines), `MobileCatalog.tsx` (384),
`DessertCard.tsx` (250) and `WavePattern.tsx` in the reference.

## Markup faults found

### The screen exists twice

`Catalog` is `hidden md:block`; `MobileCatalog` is `md:hidden`. Both are mounted at every
width, both ship, both run scroll listeners and motion. They had already drifted:

| | desktop | mobile |
|---|---|---|
| card radius | 2rem | 1.75rem |
| card surface | `bg-cream-deep` | `bg-card` |
| stepper | `h-11`, `size-8` buttons | `h-12`, `size-9` |
| filter pills | no `aria-pressed` | `aria-pressed` ✓ |
| filter pills | no check icon | animated check |
| haptics | — | `navigator.vibrate(8)` |
| column switcher | 3 / 4 / 5 | absent |
| detail reveal | over the photo | accordion below it |
| entrance spring | 120 / 16 | 240 / 26 / 0.75 |

504 lines for one screen, and nine details on which the two disagreed.

### The card

1. **The disclosure control is a `<div>` with `onClick`.** No `role`, no `tabIndex`, no key
   handler — and it carries `cursor-default`, so it announces itself as non-interactive
   while being the only way to read the description. On a touchscreen that description is
   unreachable by keyboard entirely.
2. **Layout properties are animated.** The description reveal animates `height: 0 → auto`;
   the mobile card animates its photo's `height` 260px ↔ 200px. Both lay out the card on
   every frame.
3. **Two animations fight over one node.** The outer `<article>` carries Framer's `layout`
   *and* a scroll-driven `y` transform. They write the same property, so the card jitters
   whenever the grid reflows — which is every time the filter changes.
4. **The variant toggle is two `aria-pressed` buttons**, which announces two independent
   switches rather than one choice of two.
5. **`width={1024} height={1024}` on an image rendered into `aspect-4/5`** — the declared
   ratio contradicts the rendered one. The mobile card's image declares no dimensions at all.
6. **Every image is `loading="lazy"`, including the first.**
7. **The scrim is `from-ink/75 via-ink/10`** over an arbitrary photograph. Most of this
   catalogue is a pale dessert on a pale surface, so the product name lands below threshold.
8. **No empty state.** A filter that matches nothing renders an empty grid in silence.
9. **Alpha-on-palette everywhere**: `border-ink/12`, `bg-card/35`, `bg-accent/55`,
   `text-cream/85` — six alphas of one accent color across the two files.

### The category model

`products.category_slug` is a single column, so a product sits in exactly one group. The
real catalogue does not work that way: the New York cheesecake is a whole cake, a frozen
item *and* a display-case item. The reference's model cannot express its own catalogue.

## What the rebuild does

One `Catalog`, one `ProductCard`, responsive. Hover affordances sit behind
`@media (hover: hover)`; the tap-to-open behaviour is the baseline underneath them.

- The disclosure is a real `<button>` with `aria-expanded` and `aria-controls`.
- The variant toggle is a `radiogroup` with two radios.
- The reveal is `grid-template-rows: 0fr → 1fr` — height-to-auto on the compositor.
- Drift, lift and tilt live on three separate elements, so no two animations share a property.
- The scrim has a floor: heavy under the caption band, out of the way above it.
- Empty state, and a `sizes` attribute on every image.
- Filtering is by **storage format**, and a product can be in several groups — which is
  both what the deck describes and the question a venue actually asks. Provisional until
  the schema decision lands.

### The animations are the reference's, exactly

This was the requirement, so it was done by arithmetic rather than by eye. Framer's springs
are physics, not bezier curves; each one below is the analytic solution of its damped
harmonic oscillator, sampled and emitted as a CSS `linear()` — overshoot included, which is
the part a `cubic-bezier` cannot express and the part you see.

| motion | reference spring | settle | where |
|---|---|---|---|
| card entrance | 120 / 16 / 1 | 721ms | `--ease-spring-enter` |
| hover lift −6px | 220 / 20 / 1 | 693ms | `--ease-spring-lift` |
| pointer tilt ±7° / ±6°, photo parallax ±14px | 140 / 18 / 0.4 | 489ms | `--ease-spring-tilt` |
| photo frame 1 → 0.915, radius 32 → 28 | 180 / 20 / 1 | 602ms | `--ease-spring-zoom` |
| quantity badge 0.4 → 1 | 400 / 14 / 1 | 916ms | `--ease-spring-pop` |
| value change, slide from +14px | 420 / 30 / 1 | 395ms | `--ease-spring-slide` |
| variant indicator | 480 / 34 / 0.6 | 330ms | `--ease-spring-pill` |

The rest carried over as written: photo 1.02 → 1.14 over 700ms on the house curve, wave
layer 0.46 → 1, the ribbons' 8-second drift while open, the ink wipe under the add button,
the `index % 3` entrance stagger, and the scroll drift of +26 → −26px.

What changed is where it runs. The pointer sets two custom properties, `--px` and `--py`,
and every derived transform is CSS — one write per frame instead of eight spring
integrators. The scroll drift and the filter rail's settle are scroll-driven animations, so
they cost no JavaScript at all and simply hold still where `view()` timelines are absent.
The entrance is an `IntersectionObserver` in eleven lines, matching `whileInView once`;
cards are visible without it, so nothing waits on JavaScript to paint.

## Verified

- **Hover, measured from computed styles**: tilt `matrix3d` with the expected rotation for
  the pointer position, frame `scale(0.915)`, radius 32px → 28px, reveal `0px → 29.7px`,
  waves `0.46 → 1`, lift `translateY(-6px)`. All seven fire.
- **`prefers-reduced-motion: reduce`**: tilt, lift and frame all resolve to `none`. The
  global rule collapses durations but a transform still lands instantly, so these are held
  at rest explicitly.
- **No horizontal scroll** at 320, 390 or 1440, and no element escapes its card. The variant
  toggle did overflow on the first pass — halving a flex child whose label is `nowrap` is
  circular, and the browser resolves it by letting the label spill, which put "Cela torta"
  and "Целый торт" outside the card. It is a two-column grid now.
- **Filtering**: "Bez vitrine" returns 5 of 19.
- Checked in all three locales.

## Data, after the price list

The roster now comes from the summer 2026 price list, not the deck — the deck's
slides and the sheet disagreed, and the sheet is the complete one. 15 products;
the three whole-cake rows fold into medovik, napoleon and the two cheesecakes as a
variant rather than separate items.

- **Price** is the recommended venue retail column, as one figure: the sheet quotes
  ranges and a card shows one number, so each is the middle of its range rounded to
  the nearest 10. Syrniki had no venue price and carries a stand-in, flagged in the
  fixture as `priceIsPlaceholder`.
- **Whole cake** is the piece price × 6. The sheet does carry two real whole-cake
  figures — medovik 5.600 and napoleon 7.800 — and both are well above ×6, so those
  two are currently under-priced.
- **Storage formats** are read from the sheet's own storage and shelf-life columns
  rather than guessed, which also replaced the deck-derived grouping. "Extras" is
  gone: the caramels are not on the price list.
- **Descriptions** are one sentence each, written as placeholder copy in all three
  languages until the kitchen writes its own.
- Photographs are reassigned to the new roster. Six products carry another
  product's picture, flagged as `photoIsPlaceholder`: berry tart, bird's milk,
  choux rings, mravinjak, carrot cake and syrniki.

## Card revisions after review

- **No mat.** An earlier pass baked a cream margin into each photo to give the
  desserts air. It read as weak, so the photo bleeds to the card edge as in the
  reference; the photographs are close-ups and that is a photography problem, not a
  layout one.
- **The variant indicator was 8px too far.** It is `50% - 4px` wide starting 4px in,
  so its far position is 50% of the track — exactly its own width. One step is
  therefore 100% of itself and nothing more; the extra `+ 8px` pushed it past the
  right inset on "Whole cake".
- **A stale image cache, not a crop.** "Still cropped" turned out to be
  `.next/cache/images` serving the previous export under unchanged URLs. Re-exported
  images need `.next` cleared before they appear.

## Open


- **Prices.** Every card renders its "on request" state. The catalogue needs real ones.
- **Descriptions.** The reference revealed a tasting note; there is no source for one, so
  the reveal carries the storage formats instead.
- **Five products still need photography** — Medovik sa malinom, Kolutići, Sirniki, Vanila
  sufle and Kokos karamela currently borrow another product's picture. The fixture flags
  each with `photoIsPlaceholder`.
- The category model above is provisional until the schema decision.

## The phone layout

Below `sm` the card follows the design Dmitry supplied: two columns, the photograph
borderless on the page, and the words under it rather than over it — name and price on
one line, the note beneath, then the storage chip and a round add button.

It is still **one component**. The two captions are the same markup at two positions,
each `display:none` at the other's width — which also keeps the hidden one out of the
accessibility tree, so nothing is announced twice. What is not duplicated is state:
one `open`, one variant, one cart.

What the tap on the photograph reveals changed with it. On a phone the note is already
visible, so the disclosure shows the storage line only, and the scrim — a contrast
floor for text over a photograph — appears with it instead of sitting there over
nothing.

Three things had to shrink to fit a 165px column, and each was measured rather than
guessed: the name to 14px, the storage chip to a short label (the joined list was wider
than the column and pushed the add button past the card's own edge), and the variant
toggle to 11px. The toggle now measures 108px inside a 132px frame at 320px, and 143
inside 167 at 390 — it steps down rather than being clipped, because "Whole cak" is not
a word.

The price went the other way, to 16px: on a phone it is the number the customer is
actually scanning for, and at the reference's size it was the smallest thing on the card.

Two kit additions came out of this, both because the design needed them and neither
invented: `Button shape="circle"` for an icon-only control, and a `inverse` variant —
the same ink the card already wipes across on hover. `Grid fromTwo` starts the column
ladder at two and tightens the gutter to match.

### Second pass on the phone layout

The note left the card. On a 173px column it was the only thing that could be cut
without losing a decision the customer makes from the grid — the picture, the name,
the price and how it keeps are all load-bearing; a sentence of flavour copy is not.

Tapping the photograph now opens a sheet instead of revealing a caption in place. The
kit's `Drawer` is a native `<dialog>` opened with `showModal()`, so focus trapping,
Esc and the inertness of the page behind it are the platform's job. The sheet carries
what the card cannot: the photograph again, the price at display size, the note, the
full storage list, the variant toggle and the stepper.

The photograph does two different things at two widths, and the width is read at click
time rather than during render — nothing rendered depends on it, so there is nothing
for hydration to disagree about.

The filter rail is no longer sticky. A bar that detaches from its heading and rides
over the cards behind a blur reads as a mistake rather than as help; the list is about
a screen of scrolling, and the filter stays where it was left. It still bleeds to the
edge of the screen, because a horizontally scrolling strip that stops short of the edge
looks broken.

Gutters: the phone step of the container is 16px rather than 20px, and the two-up gap
is 12px rather than 16px — eight pixels that go straight into both photographs.

The title block has a two-line floor (`min-h-title-2`, `2lh` measured against the
title's own line box). Names here run from one word to four, and without a floor the
chip and the add button sat at a different height in every column, which reads as
misalignment rather than as variety.

"Whole cake" became "Whole" on the segment. The label had to survive a 70px segment in
three languages, and the second word was carrying no information the first did not.

### Third pass

**Weight left the product name.** "Medovik, whole cake 2.5 kg" is a name with a
measurement bolted on; the two napoleons then differed only by that bolt. It is a
field now — `weightG` — shown where a weight belongs, and the two cakes are told
apart by it rather than by their titles.

**Nutrition and weight are mocked**, in a table of their own (`FACTS`) rather than
inside the rows, so replacing them with real numbers is one object to edit. The sheet
says out loud that they are provisional: a declaration goes out with every delivery,
and these are plausible figures for the kind of thing each product is, not
measurements. Macros keep one decimal — rounding 5.8 g of protein to 6 is the
difference between a figure and a shrug.

**Storage is colour-coded.** This is the one place the single-hue palette did not say
enough: a venue scanning the grid is sorting by "does this need my fridge", and three
shades of clay cannot answer that. Three pairs were added and each was measured — the
label clears 6.3:1 on its own chip, well past AA for small text — and colour is never
the only carrier, because the chip also says the word.

**The filter rail lost its bleed.** It shared a left edge with nothing; now it shares
one with the cards it filters, which is the edge everything else in the section starts
from.

**The count badge moved into the corner it belongs to**: 8px on a phone card, 16px
once there is room, and the whole-cake offset became a desktop-only concern — below
`sm` the variant toggle sits at the foot of the photograph, not its head.

**The hamburger is gone below `md`.** The page is a single scroll with three anchors
in it; a button that opens a list of places you can already reach by scrolling was a
tax on the only two things in a phone header that matter.

**The hairline above the hero's scroll cue is gone** — it pointed at nothing, and on a
cream ground it read as a rendering artefact rather than as a mark.

Open: `weightG` and `nutrition` have no columns yet. They are product facts the
console will need to edit, so they want a migration and two more fields in the product
editor before the fixture goes away.

### Demo photography

`NEXT_PUBLIC_CATALOG_DEMO_PHOTOS=1` renders the reference's six pictures in place of
the shop's own, cycled across the catalogue by position rather than by hashing the
slug — a cycle guarantees that no two cards sitting next to each other show the same
dessert, which a hash does not.

Unlike the console flag this one is allowed in a production build. It swaps
photographs and nothing else: there is no guard to disable and no data to fake, so a
deployed preview can use it, which is the whole reason it exists.

The six were re-cropped to the catalogue's own 4:5 with the same centring rule the
real photographs got, and each carries a generated blur preview — otherwise the demo
would flash empty where the real thing does not, and demonstrate a flaw the site does
not have.

### The detail panel, at every width

Clicking a card now opens the same panel everywhere. On a phone it rises from the
bottom; from `sm` it slides in from the right and keeps a 16px gap on all four sides —
a card the page slid out, not a wall welded to the edge of the window. One `Drawer`,
one set of contents, two entrances.

The in-card tap-to-reveal went with it. It was doing two jobs badly: on a phone the
caption it revealed no longer existed, and on a wide screen it duplicated what hover
already does. Hover still reveals the caption over the photograph — that is the
reference's motion, kept — and a click is now unambiguously "show me everything".

That also fixes a case neither path covered: a touch tablet at `sm` or wider has no
hover, so before this the note and the storage line were unreachable there.
