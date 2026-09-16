# Desserts and photos from the deck

Everything taken from `desserts_presentation_sr.pptx`: **names and photographs, nothing
else.** Terms, copy, contacts and grouping from that deck are out of scope — logic and
content are specified separately.

Originals live in `assets-source/deck/`, original filenames kept so this table matches.

## Names (Serbian, as written in the deck)

1. Čizkejk Njujork
2. Čizkejk Citrus
3. Čizkejk Jagoda
4. Medovik
5. Medovik sa malinom
6. Napoleon
7. Čokoladna kuglica od keksa
8. Mravinjak sa kuvanim kondenzovanim mlekom
9. Kolutići sa poslastičarskim kremom
10. Lajm tart
11. Limun tart
12. Sirniki
13. Vanila sufle u čokoladnoj glazuri
14. Brauni
15. Oraščići sa kondenzovanim mlekom
16. Rolnice sa kondenzovanim mlekom
17. Pita sa višnjama
18. Slana karamela (u tegli)
19. Kokos karamela (u tegli)

One ambiguity: slide 4 reads `Napoleon Medovik` on a single line — one hybrid cake, or two
names run together?

## Photo mapping

| File | Product | Confidence |
|---|---|---|
| `image5.png` | Čizkejk Citrus | high |
| `image10.jpg`, `image23.jpg` | Limun / Lajm tart | high |
| `image11.jpg`, `image22.jpg` | Brauni | high |
| `image13.jpg`, `image20.jpg` | Čizkejk Jagoda | high |
| `image16.jpg` | Rolnice sa kondenzovanim mlekom | high |
| `image18.jpg` | Oraščići sa kondenzovanim mlekom | high |
| `image12.jpg`, `image25.jpg` | Slana karamela — branded jars | high |
| `image21.jpg` | Čizkejk Njujork | medium |
| `image24.jpg` | Pita sa višnjama — lattice, reads apple | medium |
| `image2.jpg`, `image7.png` | pale sponge squares on trays | low |
| `image8.png`, `image14.jpg`, `image15.jpg` | cocoa logs with cream dots | low |
| `image17.jpg` | crumb-coated log with cream dots | low |
| `image4.jpg`, `image19.jpg`, `image26.jpg` | production shots | — |
| `image27.jpg`, `image28.jpg` | takeaway boxes | — |
| `image3.jpeg` | café interior | — |

**No photo found:** Napoleon, Medovik, Medovik sa malinom, Čokoladna kuglica od keksa,
Sirniki, Vanila sufle u čokoladnoj glazuri, Kolutići sa poslastičarskim kremom, Kokos
karamela. These get another dessert's photo as a placeholder, marked as a gap so it stays
obvious which products still need shooting.

## What this means for the card design

Not a content note — a layout constraint, and it belongs in the UI kit review.

The reference's card was built around seven studio shots: single plated dessert, soft
window light, cream backdrop, square, 1024×1024. The real photographs are production
shots — trays on baking paper, kitchen counters, hands, a phone camera — running from
376×640 to 2168×610, several of them pale desserts on pale surfaces.

So the card has to survive input the reference never fed it:

- The `from-ink/75` gradient scrim assumes a dark photo bottom. A cream cheesecake on a
  white plate leaves the product name unreadable. The caption needs a guaranteed contrast
  floor, not a gradient that hopes.
- A 4:5 crop destroys several of these images. A squarer frame (4:3 or 1:1) loses less.
- Mixed lighting and backgrounds will read as noise in a grid. A consistent treatment —
  fixed warm fill behind the crop, or a subtle inset frame — will do more for coherence
  than grid work will.
