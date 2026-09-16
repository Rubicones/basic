# Phase 0 — Design audit

Source: `referenceBasic` (Lovable, TanStack Start + React 19 + Tailwind v4 + Supabase).
Read in full: 92 files under `src`, 2 SQL migrations, 7 image assets, 2 Lovable plan docs.
Target: new Next.js App Router project in `basic`.

Nothing in this document is a copy instruction. It records **intent** extracted from the
reference and the **normalized system** the new project will be built from.

One correction to the brief: the reference is **not** React + Vite, it is **TanStack
Start**. Irrelevant to this document — only its rendered design is in scope — but worth
knowing when reading its files.

**Scope.** Design only. The reference's data model, RLS, server functions, admin
behaviour and business content are deliberately not audited and not carried over; the
logic is specified separately.

---

## 1. Token set

### 1.1 Colors

The reference defines colors correctly (oklch, CSS custom properties, `@theme inline`)
but names them twice and sizes the set wrong: **8 tokens for 4 roles**, plus **12 tokens
with zero usages**.

| Reference token | Value | Real role | Usages |
|---|---|---|---|
| `--cream` / `--background` | `oklch(0.977 0.014 91)` | page surface | same color, two names |
| `--card` / `--popover` | `oklch(0.993 0.006 91)` | raised surface | same color, two names |
| `--cream-deep` / `--secondary` / `--muted` | `oklch(0.951 0.026 78)` | sunken surface | same color, **three** names |
| `--ink` / `--foreground` | `oklch(0.33 0.032 275)` | primary text + dark scrims | same color, two names |
| `--clay` / `--primary` / `--ring` / `--chart-1` / `--sidebar-primary` | `oklch(0.68 0.145 34)` | brand | same color, **five** names |
| `--accent` | `oklch(0.92 0.05 45)` | brand tint surface | 1 |
| `--border` / `--input` | `oklch(0.9 0.024 66)` | hairline | same color, two names |
| `--muted-foreground` | `oklch(0.55 0.026 275)` | secondary text | 48 |
| `--destructive` | `oklch(0.577 0.245 27.325)` | error | 8 |
| `--chart-1..5`, `--sidebar-*` (12 tokens) | — | **dead** | 0 |

Worth keeping deliberately: the ink is at **hue 275** — a cool blue-violet, not a neutral
grey — sitting on a warm cream at hue 91. That cool/warm tension is the reason the page
reads as considered rather than beige. Both shadows are likewise warm-tinted (hue 34–40)
rather than black. Neither is an accident to normalize away; both carry forward.

#### The contrast problem

Measured (WCAG 2.1 relative luminance, sRGB):

| Pair | Ratio | Verdict |
|---|---|---|
| `text-primary` (#e3735a) on cream | **2.86:1** | fails AA normal text (4.5) **and** large text (3.0) |
| `text-primary` on `--accent` — the active filter pill | **2.36:1** | fails everything |
| `primary-foreground` on `bg-primary` — **the main CTA label** | **2.97:1** | fails AA |
| `text-foreground/60` on cream | 3.57:1 | fails AA normal text |
| `text-foreground/70` on cream | 4.70:1 | passes, no margin |
| `--destructive` on cream | 4.46:1 | misses AA by 0.04 |
| `--border` on cream | 1.27:1 | fails 1.4.11 (3:1) where a border is the only thing marking a control |
| `--foreground` on cream | 11.49:1 | fine |
| `--muted-foreground` on cream | 4.56:1 | passes, no margin |

`text-primary` appears **66 times**. It is the site's most-used color and it cannot legally
carry text on any of its own surfaces. Nor can the primary button carry a label: white on
it is 2.97:1, ink on it is 4.01:1 — at 14px bold neither qualifies.

There is no label color that fixes this. **The fill has to darken.** So the brand splits in two:

- `--brand` stays `oklch(0.68 0.145 34)` — decoration only: blob marks, ribbons, scrims,
  the giant watermark, quantity dots. Never under text.
- `--brand-ink` is `oklch(0.55 0.145 34)` (#b64b33) — every place text is involved.
  4.86:1 on cream, 5.05:1 under white. Same hue and chroma; it reads as the same brand.

This is a **visible deviation**: the primary button becomes a deeper terracotta. Flagged
for approval before Phase 2 — see §5.

#### Normalized set

```
/* surfaces */
--surface-page      oklch(0.977 0.014 91)   /* was cream / background        */
--surface-raised    oklch(0.993 0.006 91)   /* was card / popover            */
--surface-sunken    oklch(0.951 0.026 78)   /* was cream-deep / secondary / muted */
--surface-brand     oklch(0.92  0.05  45)   /* was accent                    */
--surface-inverse   oklch(0.33  0.032 275)  /* was ink, for scrims/overlays  */

/* content */
--content-primary   oklch(0.33  0.032 275)  /* 11.49:1 */
--content-secondary oklch(0.55  0.026 275)  /*  4.56:1 */
--content-tertiary  oklch(0.50  0.026 275)  /* replaces foreground/60, which failed */
--content-on-brand  oklch(0.99  0.008 91)   /*  5.05:1 on --brand-ink */
--content-on-photo  oklch(0.977 0.014 91)   /* stays light regardless of theme */

/* brand */
--brand             oklch(0.68  0.145 34)   /* fills + decoration only */
--brand-ink         oklch(0.55  0.145 34)   /* anything touching text  */
--brand-hover       oklch(0.50  0.145 34)   /* replaces brightness-105 / primary-90 */

/* lines */
--line              oklch(0.90  0.024 66)   /* dividers, decorative        */
--line-control      oklch(0.65  0.03  66)   /* 3.05:1 — inputs, toggles    */
--focus             oklch(0.55  0.145 34)   /* = brand-ink, 2px + 2px offset */

/* feedback */
--danger            oklch(0.55  0.21  20)   /* 5.08:1 on cream; the reference red sat at
                                               hue 27, 7° from the brand — unreadable as
                                               a distinct signal on a coral site */
--success           oklch(0.50  0.11  155)  /* 5.32:1; did not exist — success was
                                               rendered in the brand color */
```

17 tokens replacing 29, with the 12 dead ones dropped. Dark theme is **not** defined:
decision taken to ship light-only, so `color-scheme: light` and one flat block of tokens.
The reference `.dark` block was untouched shadcn slate and would have shattered the palette.

#### Alpha discipline

The reference builds colors on the fly: `bg-accent` appears at **/25, /40, /45, /55, /60,
/65** and solid — seven treatments of one color in equivalent contexts. `border-ink/12`
(19×) and `border-ink/15` (10×) mark the same control outline; both resolve to
approximately the same value as `--border`, which is *also* used 27×. Three spellings, one line.

Normalization: **alpha on a palette color is banned in components.** Solid tokens only.
`bg-accent/*` collapses to `--surface-brand` and one quiet variant. `border-ink/12`,
`border-ink/15` and `border-border` collapse to `--line` (decorative) or `--line-control`
(interactive). The only legal alphas are photo scrims (`--surface-inverse` gradients) and
`backdrop-blur` surfaces, both of which get their own named utilities.

### 1.2 Type

Two families, correct choices, loaded wrong:

```
Outfit  — display   loaded 400;600;700;800;900   used: 700, 800   → drop 400, 600, 900
DM Sans — body      loaded 400;500 + italic 400  used: 400, 500, 600, 700
```

**`font-semibold` (42 usages) and `font-bold` (32) are applied to DM Sans, which is only
loaded at 400 and 500.** Every one of those renders as browser-synthesized faux bold —
smeared stems, wrong sidebearings. Invisible in code review, obvious once you look at a
category pill next to a heading. Fix: load DM Sans 400;500;700, drop the unused italic,
and treat 600 as not existing.

Dropping the five unused faces removes five font files from the critical path.

Size collisions in equivalent contexts (uppercase micro-labels — eyebrows, badges, stat
captions, field labels):

```
text-[0.65rem]  ×10      tracking-[0.12em] ×2
text-[0.68rem]  ×2       tracking-[0.14em] ×4
text-[0.70rem]  ×5       tracking-[0.16em] ×5
```

Three sizes and three trackings for one thing. **Collapsed to `text-micro` = 0.6875rem
(11px) / tracking 0.14em / uppercase / weight 500.**

Section headings are the second collision. The same hierarchy level is written three ways:

```
Catalog          text-5xl lg:text-6xl  leading-[0.95]
MobileCatalog    text-4xl              leading-[0.95]
OrderConditions  text-4xl sm:text-5xl  leading-none
```

**Normalized scale** (Outfit for display, DM Sans for the rest):

| Token | Size | Line height | Tracking | Use |
|---|---|---|---|---|
| `display-xl` | `clamp(3.25rem, 9vw, 6rem)` | 0.87 | -0.02em | hero h1, once per page |
| `display-lg` | `clamp(2.25rem, 5vw, 3.5rem)` | 0.95 | -0.015em | section h2 |
| `display-md` | 1.875rem | 1.05 | -0.01em | admin h1, dialog titles |
| `display-sm` | 1.5rem | 1.1 | -0.01em | card group titles |
| `title` | 1.25rem | 1.2 | 0 | product card name |
| `body-lg` | 1.125rem | 1.6 | 0 | hero lead |
| `body` | 1rem | 1.6 | 0 | default |
| `body-sm` | 0.875rem | 1.55 | 0 | dense UI, form text |
| `caption` | 0.75rem | 1.45 | 0 | helper text |
| `micro` | 0.6875rem | 1.3 | 0.14em | uppercase labels |

The hero clamp drops from `7rem` to `6rem` max: at 7rem the two-line h1 with the
Serbian/Russian strings (§1.7) overflows a 1280px viewport.

### 1.3 Spacing

The reference uses effectively the entire Tailwind scale —
`0.5 1 1.5 2 2.5 3 3.5 4 5 6 7 8 10 12 14 16 20 24 28` — with no evidence of a decision
behind any of it. Concrete equivalent-context collisions:

- **Pill padding:** `py-2` (13×), `py-2.5` (4×), `py-3` (15×), `py-3.5` — four heights for
  one control, because the control was sized by padding instead of by height.
- **Control heights:** `h-10`, `h-11`, `h-12`, `size-7`, `size-8`, `size-9` coexist. The
  quantity stepper is `h-11` with `size-8` buttons on desktop and `h-12` with `size-9` on
  mobile — the same component, two sizes, in two files.
- **Section rhythm:** `py-20 lg:py-28` (Catalog, OrderForm), `py-16 lg:py-20`
  (OrderConditions), `py-14 md:py-20` (WelcomeScreen), `py-10` (footer). Four rhythms for
  four peer sections.
- **Gutters:** `px-5 lg:px-10` (public), `px-4 lg:px-8` (admin),
  `px-5 sm:px-8 lg:px-10` (hero). Three gutters in one product.
- **Container widths:** `max-w-7xl` public, `max-w-6xl` admin, plus 4xl/3xl/2xl/xl/md/sm/xs
  sprinkled for measure control.

**Normalized:** a 4px base, restricted to `1 2 3 4 5 6 8 10 12 16 20 24 28`
(4→112px). `0.5`, `1.5`, `2.5`, `3.5`, `7`, `14` are removed from the scale — if a gap
needs one of them, the scale is wrong and gets extended deliberately, not locally.

Sizes become tokens rather than paddings:

```
control-sm  32px      section-compact  56 / 72     gutter   20 / 40
control-md  44px      section          80 / 112    content  1280
control-lg  52px      section-loose   112 / 160    measure   672 (≈68ch)
                                                   form      448
```

### 1.4 Radii

`--radius: 1.25rem` with a derived ladder (`sm` 16 → `4xl` 36) is defined in the theme —
and then bypassed. `rounded-[2rem]` (7×), `rounded-[1.75rem]` (3×), `rounded-[1.5rem]`
(6×) are arbitrary values that land *exactly* on the ladder's 32 / 28 / 24. The scale
existed; nobody used it.

Result: three card radii for one element class — dessert card 2rem, city card 1.75rem,
admin card 1.5rem.

**Normalized:**

```
--radius-pill   9999px   pills, chips, icon buttons, CTAs
--radius-card     28px   the one card radius
--radius-panel    24px   forms, dialogs, sheets
--radius-control  16px   inputs, selects, textareas
--radius-inner    12px   nested tiles inside a card
```

A live bug this exposes: `DessertCard` puts `rounded-[2rem]` on the outer card *and*
`rounded-[2rem]` on the image container inside it, then animates the inner radius to 28px
while scaling it to 0.915. Nested equal radii already read wrong; scaling the inner one
makes its curve diverge from the outer visibly. Inner radius must be outer minus the gap.

### 1.5 Shadows

Two, both warm-tinted, both good:

```
--shadow-soft  0 2px  8px -2px  oklch(0.4  0.06 40 / 0.08)
--shadow-lift  0 28px 60px -30px oklch(0.45 0.1  34 / 0.35)
```

Carried over unchanged. Two additions: `--shadow-overlay` for dialogs (the reference
reuses `shadow-lift`, which is a hover affordance, for a modal) and `--shadow-focus` for
the focus ring described in §3.

### 1.6 Breakpoints

Tailwind defaults, `sm` 640 / `md` 768 / `lg` 1024 / `xl` 1280 / `2xl` 1536. `md` is the
load-bearing one: it switches the entire catalog between two separate implementations
(§2.1). Kept as-is; no custom breakpoints needed.

### 1.7 Motion

Defined once, then abandoned. `--ease-smooth: cubic-bezier(0.22, 1, 0.36, 1)` lives in CSS
and is re-declared as a literal `[0.22, 1, 0.36, 1]` array in five component files.

Counted across the components: **15 distinct spring configurations, 18 distinct durations,
3 CSS durations.** No two components agree on what "fast" means.

The dependency policy rules out Framer Motion, so this becomes CSS + the Web Animations
API, which is the right outcome anyway — most of the reference's motion is a transform and
an opacity.

```
--duration-fast    150ms   hover, color, focus
--duration-base    250ms   toggles, reveals
--duration-slow    400ms   panel expand/collapse, layout shifts
--duration-enter   700ms   scroll entrances
--ease-out         cubic-bezier(0.22, 1, 0.36, 1)   (the reference curve, kept)
--ease-in-out      cubic-bezier(0.65, 0, 0.35, 1)
--ease-spring      linear(…)  one springy curve for tactile taps, generated once
```

Motion faults to correct, not port:

1. **Layout properties are animated.** `MobileDessertCard` animates `height` 260↔200px;
   two components animate `height: 0 → auto`. Both trigger layout on every frame.
   Replacement: `grid-template-rows: 0fr → 1fr`, which animates on the compositor.
2. **Animation attached to the wrong element.** `DessertCard`'s outer `<article>` carries
   both `layout` (a Framer layout animation) and a scroll-driven `y` transform. They write
   to the same property and fight; the card jitters when the grid re-flows during a filter
   change.
3. **Content is gated behind animation.** Nearly every block is `whileInView` with
   `once: true` and `initial={{ opacity: 0 }}`. Before hydration the page is blank — the
   LCP element is invisible until JS runs and an observer fires. Content paints first;
   motion decorates what is already there.
4. **`prefers-reduced-motion` honored inconsistently.** The global CSS block is correct,
   but `useReducedMotion` is checked in `WelcomeScreen` and `MobileCatalog` and ignored in
   `Catalog` and `DessertCard`. Handled once, in CSS, for everything.
5. **Continuous full-screen repaint.** `.welcome-ribbons` applies `filter: blur(28px)` to
   a full-bleed element and animates its position forever. Static, or `will-change` with a
   much smaller blurred layer scaled up.
6. **Dead utilities.** `marquee-track`, `drift`, `grain` are defined and never used.

---

## 2. UI inventory

Grouped by what the element actually is, with the accidental duplicates called out.

### 2.1 The catalog exists twice

`Catalog.tsx` (`hidden md:block`, 120 lines) and `MobileCatalog.tsx` (`md:hidden`, 384
lines) are two implementations of one screen. Both are mounted, both ship, both run scroll
listeners and motion, and **the desktop catalog's markup is in the DOM on a phone** (and
vice versa) — display:none removes it from the accessibility tree, not from the bundle.

They have already diverged:

| | desktop | mobile |
|---|---|---|
| card radius | 2rem | 1.75rem |
| card surface | `bg-cream-deep` | `bg-card` |
| stepper | `h-11`, `size-8` | `h-12`, `size-9` |
| filter pills | no `aria-pressed` | `aria-pressed` ✓ |
| filter pills | no check icon | animated check icon |
| haptics | — | `navigator.vibrate(8)` |
| columns switcher | 3 / 4 / 5 | absent |
| detail reveal | inline over the photo | accordion below the photo |
| spring | `stiffness 120 damping 16` | `stiffness 240 damping 26 mass 0.75` |

This is the largest single item of work in the port: **one catalog, one card, responsive.**
Hover-only affordances go behind `@media (hover: hover)`; the tap-to-expand behaviour is
the accessible baseline that hover enhances.

### 2.2 Buttons — 5 real variants, 22 usages, 11 accidental sizes

| Variant | Usages | Accidental variation |
|---|---|---|
| Solid pill CTA | 10 | heights `h-11`, `h-12`, `py-3`, `py-4`, unset; 2 of 10 have the ink-wipe hover, 8 don't |
| Outline pill | 6 | `px-7 py-4`, `px-4 py-2`, `px-3.5 py-2`, `px-3.5 py-1.5`; borders `ink/12` and `ink/15` |
| Ghost / text | 3 | one is the **only** shadcn `<Button>` in the codebase; the other two are bare `<button>`/`<a>` |
| Round icon | 4 | `size-7`, `size-8`, `size-9` for one control |
| Segmented toggle | 4 | category pills (2 divergent impls), columns 3/4/5, Piece\|Whole (2 divergent impls) |

Collapsing to: `Button` with `variant` (solid / outline / ghost / danger), `size`
(sm / md / lg), plus `IconButton` and `SegmentedControl` as separate primitives, since
their semantics differ (a segmented control is a radio group, not three buttons).

### 2.3 Cards — 11 treatments, 3 real roles

Dessert card (desktop), dessert card (mobile), city card, order-form panel, cart panel,
admin product card, admin field row, admin user row, admin stat tile, conditions inner
tile, modal sheet. Four radii, two surfaces, three shadow states.

Collapsing to `Card` (content, 28px, raised, soft→lift on hover), `Panel` (form/dialog
container, 24px, no hover) and `Tile` (nested, 12px, sunken, no shadow).

### 2.4 Inputs — one string, copy-pasted five times, already divergent

```
OrderForm.tsx       …transition-colors duration-300 focus:border-primary
auth.tsx            …transition-colors               focus:border-primary
admin.form.tsx      …transition-colors               focus:border-primary
admin.products.tsx  …transition-colors               focus:border-primary
admin.users.tsx     …transition-colors               focus:border-primary
```

Identical except one has a duration. The label class is likewise duplicated verbatim
across `admin.form.tsx` and `admin.products.tsx`, and re-inlined with a different tracking
in `OrderForm.tsx`.

All five carry `outline-none` with only a border-color change on `focus:` (not
`focus-visible:`) — see §3.

### 2.5 Badges — 6 treatments

Product tag, admin "hidden", admin status (5 color states), "Delivery area" chip, order-form
info chips, hero location badge. Between them: six background alphas of `--accent`, three
trackings, two text colors. Collapsing to `Badge` with `tone` (neutral / brand / success /
danger / inverse).

### 2.6 The shadcn layer

`src/components/ui/` holds **46 files**. Exactly **one** is imported anywhere: `button.tsx`,
once, in `OrderConditions.tsx`. The other 45 are dead, and they drag ~30 Radix packages
plus `recharts`, `embla-carousel`, `cmdk`, `vaul`, `sonner`, `react-hook-form`, `zod`,
`date-fns`, `input-otp`, `react-day-picker`, `react-resizable-panels` into the dependency
tree — none of them used.

The new project starts at zero dependencies beyond Next/React/Tailwind/Supabase, per the
dependency policy. Where a primitive genuinely needs focus-trap and dismiss semantics
(Dialog, Drawer), the plan is the platform's `<dialog>` element plus `popover` where
supported — no library. If that turns out to be insufficient for the drawer, that will
come back as a written proposal, not a quiet install.

### 2.7 Dead assets

`src/assets/` holds 7 JPEGs (~1MB) — `hero.jpg` and `dessert-1..6.jpg`. **None is imported
anywhere.** Product images come from Supabase Storage through a proxy route; the hero is
typographic and has no image at all. They are leftovers from an earlier iteration.

---

## 3. Accessibility findings

Beyond the contrast numbers in §1.1:

1. **Focus is effectively removed.** Five `outline-none` declarations, zero
   `focus-visible` rules, and the only focus feedback is a border color change from
   `--border` to `--primary` — 1.27:1 → 2.86:1 against cream. A keyboard user cannot see
   where they are. Non-negotiable fix: a 2px `--focus` ring at 2px offset on every
   interactive element, never removed.
2. **The dessert card is keyboard-unreachable on touch/narrow.** The expand toggle is a
   `<div>` with `onClick`, no `role`, no `tabIndex`, no key handler — and it carries
   `cursor-default`, actively signalling it is not interactive while being the only way to
   read the product description.
3. **Same control, different semantics.** Category pills expose `aria-pressed` in
   `MobileCatalog` and not in `Catalog`. The Piece|Whole toggle is a pair of
   `aria-pressed` buttons where it is really a radio group.
4. **Native `confirm()`** for destructive actions in admin (product delete, field delete) —
   blocking, unstyled, unannounced.
5. **Heading structure.** 9 `<h1>` across the app (one per route, correct), but both
   catalogs emit an `<h2>` reading "The catalog" and both are in the DOM; and no section
   below the hero uses `<h3>` consistently — card titles are `<h3>` in the catalog and
   `<p>` in the cart and admin lists.
6. **Photo text without a contrast guarantee.** `text-cream/85` and `text-cream/70` sit on
   a `from-ink/75` gradient over an arbitrary uploaded photograph. A pale dessert on a
   pale plate — which is most of the real photography (see `desserts.md`) — puts the
   product name below threshold. The scrim needs a floor, not a gradient that assumes a
   dark photo.
7. **No skeletons, no empty states in the public catalog.** A filter that matches nothing
   renders an empty grid with no message. `useSuspenseQuery` has no visible boundary.
8. **Images.** `DessertCard` declares `width={1024} height={1024}` on an image rendered
   into an `aspect-4/5` box — the declared ratio contradicts the rendered one.
   `MobileCatalog`'s image declares no dimensions at all. Every image, including the first
   card, is `loading="lazy"` — so the likely LCP element is deliberately deferred.

---

## 4. Screen inventory

### Public — `/` (single page)

| # | Section | Contents, in order |
|---|---|---|
| 1 | Nav (fixed) | logo lockup pill (blob + wordmark) · nav pill: Catalog / Order / For business · solid CTA "Order sweets" |
| 2 | Hero | 3 decorative blob marks · blob + wordmark · location badge · h1 (2 lines, second in brand) · lead paragraph · 2 CTAs (solid + outline) · scroll cue · giant "basic" watermark at 4.5% |
| 3 | Catalog | h2 + helper text · category filter row · columns switcher 3/4/5 (desktop only) · product grid |
| 3b | Product card | photo (4:5) · tag badge · Piece\|Whole toggle · qty badge · name + price · description reveal on hover/tap · pairing line · stepper · add button |
| 4 | Order conditions | eyebrow · h2 · lead · 2 city cards (Belgrade, Novi Sad), each: name + area chip, minimum tile, delivery tile, schedule strip, expand toggle, detail list |
| 5 | Order form | h2 · lead · 2 info chips · form panel (label + control pairs, full- and half-width) · submit with total · success/error message · cart panel (sticky at `lg`) with line items, steppers, total, clear |
| 6 | Footer `#business-contact` | heading + address · 3 value props with icons · staff console link |
| 7 | Mobile order bar | fixed, appears when cart non-empty: count badge, total, checkout link |

Plus: 404 page, root error boundary.

### Admin — `noindex`, cookie-locale only

| Route | Sections |
|---|---|
| `/auth` | one card, three modes: create owner / sign in / choose password |
| `/admin` (layout) | header: logo + "console" label, View site, Sign out · desktop tab row (Orders, Desserts, Order form, Team) · mobile bottom nav, same 4 |
| `/admin` | h1 · 3 stat tiles (New, All orders, Value) · order list as `<details>` rows: name, timestamp, item count, total, status badge; expanded: line items, form answers, 5 status buttons · empty state |
| `/admin/products` | h1 + "New dessert" · product grid (photo, hidden badge, name, prices, Edit, Delete) · categories panel with inline add · modal: photo upload, name, description, price, whole price, category, badge, pairing, position, active toggle, save |
| `/admin/form` | h1 + "New question" · field rows (label, required marker, type, placeholder, hidden state, Edit, Delete) · modal: key, label, type, placeholder, parser, help, required, width, options, position, active |
| `/admin/users` | h1 · invite row (email + send) · user rows (name, "you" marker, email, role toggle, delete) |

This is the design surface inventory only — what each screen shows and in what order.
What drives it is out of scope here.

---

## 5. Decisions needed before Phase 1

1. **Brand darkening.** `--brand-ink` at `oklch(0.55 0.145 34)` makes the primary button
   and all brand text a deeper terracotta than the reference's coral. It is the only way
   to reach AA. Approve, or accept documented AA failures on the main CTA?
2. **Control borders.** `--line-control` at 3.05:1 is visibly firmer than the reference's
   1.27:1 hairlines on inputs and toggles. Approve the firmer line, or keep hairlines and
   carry the 1.4.11 failure?

Both are visual decisions with no way to satisfy WCAG AA otherwise. Everything else in
this document is a normalization I can carry out without a decision.

Phase 1 will arrive with the localized-content schema proposal (localized columns vs
`translations` jsonb vs side table) and stop for a decision, per the brief.

---

## 6. What carries over unchanged

Worth stating, so the port doesn't discard what was right:

- The oklch color discipline and the `@theme inline` → custom property structure.
- The warm/cool tension: cool ink (hue 275) on warm cream (hue 91), warm-tinted shadows.
- `--ease-smooth` `cubic-bezier(0.22, 1, 0.36, 1)` as the house curve.
- The two-shadow model (soft resting, lift on raise) rather than an elevation ladder.
- Outfit + DM Sans, and the dotless-ı `basıc` wordmark.
- The blob mark as a scalable `currentColor` SVG — it works at 32px in the nav and at
  30rem as a background wash from one path.
