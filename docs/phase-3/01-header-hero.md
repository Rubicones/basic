# Screen 1 — header and hero

Reviewed in the reference before rebuilding: `src/routes/index.tsx` (the `Nav` function) and
`src/components/WelcomeScreen.tsx`.

## Markup faults found

### Structural

1. **No mobile navigation exists.** The nav is `hidden … md:flex`. Below 768px, Catalog,
   Order and For business are unreachable from the header — the only control is the CTA.
   Not a styling bug: a third of the site's navigation is missing on a phone.

2. **The header height is guessed twice, differently.** `<main>` has `pt-24` (96px);
   `WelcomeScreen` sizes itself with `calc(100svh-5rem)` (80px) and again with
   `min(860px,calc(100svh-5rem))`. Two files disagree about the height of the same header,
   and neither derives it from the header.

3. **The third nav link is copy-pasted.** Two links are generated from an array; "For
   business" is written out separately with the same 200-character class string. The two
   have already drifted — the array version is inside the `.map`, the third is not, so any
   change to one silently skips the other.

4. **The logo is not a link.** It is a `<div>`. There is no way back to the top from
   anywhere on the site.

5. **`<span className="relative">ı</span>`** — a wrapper with a positioning class and no
   offset, so it does nothing. Present in both the hero wordmark and `BasicLogo`.

### Motion

6. **The whole hero is invisible until JavaScript runs.** Everything is inside a
   `motion.div` with `initial="hidden"` → `opacity: 0`. The h1 is the LCP element, so the
   largest paint is deliberately deferred behind hydration.

7. **A full-bleed 28px blur is animated forever.** `.welcome-ribbons` covers the section,
   carries `filter: blur(28px)`, and Framer animates its x/y on a 20-second infinite loop —
   a continuous full-screen composite for a decorative wash. Two more blob marks run their
   own infinite rotate/translate loops, and the scroll cue a third.

8. **`hover:gap-3` on the CTA** animates a layout property.

### Accessibility

9. **No skip link**, and `<nav>` has no accessible name.
10. **Nav links have a hover underline and no focus treatment** — the `after:` animation is
    bound to `:hover` only, so keyboard users get nothing.
11. **The address is a `<p>`** with a pin icon, not marked up as an address or linked to a map.

### Type and layout

12. **`max-w-[13ch]` on the h1** was measured against English. Serbian and Russian run ~1.4×,
    so the same measure produces a different line count and a different shape.
13. **The hero h1 clamp tops out at 7rem.** At 1280px the two-line heading with the Serbian
    string overflows; the audit already reduced the cap to 6rem.
14. **`-bottom-[0.22em]`** on the watermark — an arbitrary em offset tuned to one string in
    one language.

## What the rebuild does differently

Deviations, each with a reason:

- **A mobile menu exists.** A disclosure button opens the same three links. The reference
  simply had none.
- **One header height token** (`--header-h`), used by the header, by the hero's `min-height`
  and by `scroll-mt` on anchored sections. The three can no longer disagree.
- **Content paints first.** The entrance is a CSS animation with `both` fill, so the markup
  is in the HTML and visible without JavaScript; `prefers-reduced-motion` kills it through
  the global rule rather than a per-component check.
- **The animated full-screen blur is gone.** The wash is static. The blob marks keep one
  slow drift between them instead of three independent infinite loops.
- **The logo is a link home.** The nav is a labelled `<nav>`. Links show focus.
- **The h1 measure is set in `rem`, not `ch`**, so it does not change meaning per language,
  and the heading is checked in all three locales.

Copy is ported from the reference and translated. It is the reference's consumer voice —
if the site is for venues rather than walk-ins, this is the first thing that changes.

## Verified

Built, served and driven in a real browser.

- **No horizontal scroll and no header overflow** at 320, 390, 768 or 1440. The header did
  overflow at 320 on the first pass — logo, CTA and menu button together exceed the width —
  so below 640px the lockup is the mark alone. The link keeps its accessible name.
- **The h1 paints without JavaScript**, at `opacity: 1`, with its text in the HTML. The
  reference's equivalent sat at `opacity: 0` until hydration, with the LCP element inside it.
- **Tab order**: skip link → lockup → Catalog → Order → For business → header CTA → hero
  primary → hero secondary. Every one shows a 2px outline; nothing is skipped or trapped.
- **The mobile menu** opens, `aria-expanded` tracks it, and the panel is `hidden` while
  closed so it stays out of the tab order.
- `--header-h` resolves to 72px and the header's measured bottom edge is exactly 72 — the
  hero's `min-height` and every anchored section derive from the same value.
- Checked in all three locales. Serbian and Russian headlines wrap to a different line count
  than English, which is why the measure is a rem token rather than the reference's `13ch`.

## Left as it was

- The watermark still sits behind the scroll cue, as in the reference. It is offset in `em`
  so it tracks the clamped font size instead of needing a value per breakpoint.
- The copy is the reference's, translated. If this site is for venues rather than walk-ins,
  the hero is the first thing that changes.
