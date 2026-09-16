# Phase 2 — UI kit

Review surface: **`/en/dev/uikit`**, also at `/sr/...` and `/ru/...`. `npm run dev`, then open it.
It is `noindex` and excluded from the sitemap.

## What is in the kit

**Controls** — Button, Link, Input, Textarea, Select, Checkbox
**Surfaces** — Card, Panel, Tile, Badge, Skeleton, Media
**Overlays** — Dialog, Drawer, Toast
**Layout** — Container, Section, Stack, Grid

Zero dependencies. Icons are twelve inline SVGs rather than a library. Dialog and Drawer
are the native `<dialog>` element, so focus trapping, Esc, the inert background and the top
layer come from the platform instead of from 40 kB of JavaScript that reimplements them
imperfectly.

**No component accepts `className`.** A one-off style on a primitive is how a design system
stops being one. A screen that needs something the kit cannot express adds a variant here,
deliberately.

## Enforcement, not convention

`npm run lint` fails on:

- any bracket value — `mt-[13px]`, `text-[0.7rem]`, `rounded-[1.75rem]`
- any raw color — hex, `rgb()`, `hsl()`
- any stock Tailwind hue — `text-red-500`, `bg-slate-100`

And the token layer clears Tailwind's own scales (`--radius-*: initial`, `--text-*: initial`),
so `rounded-md` and `text-xl` do not exist to be reached for. There is one radius scale and
one type scale, and they are the ones in the audit.

Motion is the same: four named durations, two easings, and four named transitions that carry
their own duration and property list. A component never writes a timing. The reference had
15 spring configurations and 18 durations across four files.

## Verified in a browser, not by eye

Built, served, and driven with a real Chromium.

**Contrast** — every text and border pairing measured from computed styles, resolved through
a canvas pixel because computed values come back as `oklch()`.

The reference palette is kept by decision, so most of these are under AA. Recorded exactly,
because a known number is a decision and an unknown one is a defect:

| | text | border |
|---|---|---|
| input, textarea, select | 12.09:1 | 1.33:1 ✗ |
| input, error state | 12.09:1 | 4.68:1 |
| input, disabled | 4.20:1 ✗ | 1.17:1 ✗ |
| placeholder | 4.56:1 | — |
| badge neutral | 4.20:1 ✗ | — |
| badge brand | 2.88:1 ✗ | — |
| badge success / danger | 5.59 / 4.68 | 5.59 / 4.68 |
| badge on photo | 11.51:1 | — |
| **button solid — the main CTA** | **2.98:1 ✗** | — |
| button outline | 12.09:1 | 1.33:1 ✗ |
| button ghost | 2.86:1 ✗ | — |
| caption | 4.53:1 | — |

Eleven pairings below threshold, all of them a direct consequence of keeping the reference's
clay and hairline. The disabled ones are exempt under 1.4.3 and 1.4.11; the rest are not.

Two things are still done properly inside that constraint. **Focus** uses ink rather than
clay — a clay ring is 2.86:1 against cream, which means a keyboard user cannot see where they
are, and ink is a reference color too, at 11.49:1. And **placeholders** use the reference's
`muted-foreground` rather than its `foreground/60`, which is both more faithful and the only
one of the two that clears AA.

If any of this is ever revisited, the whole set moves from two lines in `globals.css`:
`--color-brand` and `--color-line-control`. Nothing else in the kit encodes a color.

**Layout** — no horizontal scroll at 320, 390, 768 or 1440. Serbian and Russian strings at
~1.4× the English length hold in buttons, labels, badges and fields at every width, including
the worst case of one unbroken 24-character word.

**Overlays** — dialog centres (x 496 of 1440, width 448); Esc closes and state follows;
drawer is flush right on desktop and flush bottom full-width on a phone; the error toast
carries `role="alert"`.

**Focus** — visible on every interactive element. There is no `outline-none` anywhere in the
codebase.

## Four things the verification changed

Worth recording, because each was wrong in a way that reading the code would not have caught.

1. **The error state was decorative.** `<Field error="…">` rendered the red sentence while
   `<Input>` set `aria-invalid` — so a field could look invalid and announce itself as valid.
   Measured: the error border was identical to the default. Input, Textarea and Select now own
   their label, help and error; `Field` is exported only for a control the kit does not have.
2. **`aria-invalid` has no Tailwind variant.** Tailwind ships `aria-checked` and friends but
   not this one, so the rule was never generated. Added as a custom variant.
3. **Disabled was an opacity.** Fading a solid button composites fill and label toward the
   page together, so the label's contrast depends on whatever is behind the button — it
   measured 2.60:1. Disabled is now an explicit surface: 5.93:1, and knowable.
4. **The dialog was pinned to the left edge.** `m-0` killed the UA's `margin: auto`, which is
   what centres a `<dialog>`. Only visible in a screenshot.

Also corrected from Phase 1: `--color-content-secondary` was *lighter* than
`--color-content-tertiary` — the ladder ran backwards — and secondary failed at 4.20:1 the
moment it sat on the sunken surface. Both re-derived.

## Fonts

Russian runs on Onest, chosen by measuring rather than by eye: x-height 0.527 against DM
Sans's 0.504, cap height within 0.001 em of both Outfit and DM Sans, average advance within
0.014 em. Unbounded was 39% wider and Manrope's ascender 0.07 em taller. Latin, latin-ext and
Cyrillic are merged into one file per weight.

The tradeoff: Russian runs on one family where the others run on two, so display/body contrast
is carried by weight rather than by shape.

## Open

- The reference palette is in, with the eleven measured AA failures above. Decided, not open.
- Nothing is preloaded. If the font swap on the hero heading is objectionable once Phase 4
  measures LCP, the fix is a hand-written preload keyed to locale.

**Next: Phase 3.** Per your order — for each screen, first a written pass over that screen's
markup in the reference, then the rebuild on these primitives, then a report and a stop.
