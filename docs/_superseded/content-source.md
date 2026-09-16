# Content source — `desserts_presentation_sr.pptx`

14 slides, Serbian, 28 embedded images. Extracted in full. This deck — not the reference
repo — is the authority on what the business sells and to whom.

## 1. What the deck changes about the brief

The reference site reads as a consumer dessert shop with a business footnote. The deck is
**B2B, start to finish**: *"DESERTI ZA VAŠ LOKAL"* — desserts for your venue. The buyer is
a café or restaurant owner in Belgrade or Novi Sad choosing a pastry supplier, not a person
buying a slice.

That reframes several things the reference got consumer-shaped:

| Reference | Deck |
|---|---|
| "Order sweets", "Add to order", "Your box" | a venue requesting a wholesale quote |
| "pairs with double espresso" | irrelevant — the venue sets its own pairing |
| price per piece / per whole cake | wholesale terms, minimum order, deferred payment |
| tag "team favorite", "hit" | storage format, shelf life, declaration |
| hero: "coffee & breakfast. sweet things." | "we supply venues that share our standards" |

The delivery-conditions section in the reference turns out to be a faithful English
translation of deck slides 10–11 — that content is real and stays. The hero, the card
copy and the CTAs are consumer voice and need rewriting for a trade audience.

**The single most useful thing on this site, for this buyer, is the storage-format filter**
(§2). A café without a chilled display case needs to see only what survives on a counter.

## 2. Catalogue — and the schema problem it creates

19 SKUs: 17 desserts + 2 jarred caramels. The deck groups them by **storage format**, and
the groups overlap:

| Product | whole cake | frozen | chilled case | no case |
|---|:--:|:--:|:--:|:--:|
| Čizkejk Njujork | ● | ● | ● | |
| Čizkejk Citrus | ● | | | |
| Čizkejk Jagoda | | | ● | |
| Medovik | | ● | | |
| Medovik sa malinom | ● | ● | | |
| Napoleon | ●? | ● | | |
| Čokoladna kuglica od keksa | | ● | ● | |
| Mravinjak sa kuvanim kondenzovanim mlekom | | ● | | ● |
| Kolutići sa poslastičarskim kremom | | | ● | |
| Lajm tart | | | ● | |
| Limun tart | | | ● | |
| Sirniki | | | ● | |
| Vanila sufle u čokoladnoj glazuri | | | ● | |
| Brauni | | | | ● |
| Oraščići sa kondenzovanim mlekom | | | | ● |
| Rolnice sa kondenzovanim mlekom | | | | ● |
| Pita sa višnjama | | | | ● |
| Slana karamela (tegla, vaš logotip) | — additional product — |
| Kokos karamela (tegla, vaš logotip) | — additional product — |

**The reference schema cannot express this.** `products.category_slug` is a single text
column with a foreign key — one category per product. Čizkejk Njujork needs three.

More precisely: storage format is not a category at all, it is a **facet**. Dessert *type*
(cheesecake / layer cake / tart / cookie / pastry) is a second, orthogonal facet. Modelling
storage format as the category will produce duplicate product rows the moment someone in
the admin panel tries to list Čizkejk Njujork in all three groups.

Proposal, to be argued properly in the Phase 1 schema round:

- `products` keeps one **type** (`category_slug` — cheesecake, cake, tart, …) for grouping.
- **Storage formats** become a separate many-to-many: `product_formats(product_id, format)`
  where format ∈ `whole | frozen | chilled | ambient`, each with its own shelf-life text.
- Filters on the site are then: format (primary, the buyer's real question) × type
  (secondary).

Shelf life is per-format, not per-product, and the deck states it:

- **Frozen** — thaws in up to 2 hours; after thawing keeps 12 hours without a display case,
  3 days in a chilled display case.
- **Chilled case** — some items also keep outside a case at a shortened shelf life; the
  exact figure is stated in the declaration accompanying each delivery.
- **General** — no preservatives, shelf life 2–3 days.

## 3. Verbatim content

### About (slide 2)
> Zdravo! Mi smo **Vladislav i Viktor** — osnivačice kafića Basic, a pre skoro godinu dana
> pokrenule smo poslastičarski pogon. Naš asortiman svakodnevno obraduje stotine gostiju.
> Čuvamo svoju reputaciju i rado ćemo postati pouzdan partner lokalima koji dele našu
> strast prema beskompromisnom kvalitetu i estetici.

⚠️ The names do not agree with anything else in the deck: *osnivačice* / *pokrenule* are
feminine plural, the names given are masculine, and the contact slide lists **Elizaveta**
and **Ekaterina**. Needs correcting before it goes on a page in three languages.

### Why us (slide 3)
- Koristimo samo visokokvalitetne sastojke
- Prednost dajemo sezonskom voću i povrću — za sveže i ekskluzivne ukuse
- Ne dodajemo konzervanse — rok trajanja je 2–3 dana, jer se oslanjamo na prirodnost i svežinu
- Prilagođavamo recepte ukusima gostiju

### Smart assortment (slide 5)
- Deserti za rashladnu vitrinu — spremni za serviranje, lepo izgledaju i čuvaju ukus i
  teksturu tokom čuvanja u rashladnoj vitrini.
- Deserti bez vitrine — odlično se čuvaju na sobnoj temperaturi.
- Zamrznuti deserti — idealno rešenje za preciznu kontrolu otpisa i zaliha.

### Terms — Belgrade (slide 10)
- Minimalna porudžbina — **3.000 dinara**
- Popust za lično preuzimanje iz centra
- Dostava **300 dinara** za udaljene delove grada
- Odloženo plaćanje — **10 dana** (mogući individualni uslovi po dogovoru)
- Dostava do **12:00**, od ponedeljka do subote
- Porudžbina **2 dana unapred**; može se formirati odmah za celu nedelju
- Hitne porudžbine po dogovoru (u okviru trenutnog asortimana)
- Deserti po individualnoj porudžbini — u skladu sa stilom i konceptom vašeg lokala
- Torte po porudžbini — za događaje i vaše goste
- Plaćanje po računu sa PDV-om · Deklaracija uz svaku isporuku

### Terms — Novi Sad (slide 11)
- Minimalna porudžbina — **15.000 dinara**
- Odloženo plaćanje — **10 dana** (mogući individualni uslovi po dogovoru)
- Dostava do lokala **300 dinara**
- Dostava **1 put nedeljno**
- Porudžbina **2 dana unapred**; može se formirati za nedelju / mesec
- Deserti po individualnoj porudžbini · Torte po porudžbini
- Plaćanje po računu sa PDV-om · Deklaracija uz svaku isporuku

### Whole cakes (slide 4)
> cele torte primamo u porudžbinu uz prethodni dogovor

### Contact (slide 14)
```
BASIC — kafić i poslastičarski pogon
+381 62 1130 159  Elizaveta
+381 61 2988 794  Ekaterina
basiccoffeers@gmail.com
```
CTA: *Kontaktirajte nas — poslaćemo vam deserte za degustaciju.*

This is the deck's actual conversion goal: **request a tasting box**, not "send order".
Worth considering as the primary CTA over the reference's cart-and-submit flow — the cart
then becomes "the items I want to taste / quote".

## 4. Sections the deck has and the reference does not

New work, to design in the reference's visual language rather than invent a style for:

1. **About / founders** — with a real photo (café interior, slide 2).
2. **Why us** — four claims, the sourcing-and-no-preservatives argument.
3. **Storage formats explained** — the three-format model as a teaching section; it is the
   spine of the catalogue filter.
4. **Additional products** — jarred caramel with the venue's own logo. A different product
   shape from a dessert (co-branded, not per-piece) and it does not fit the dessert card.
5. **Gallery** — slides 12–13 are 13 loose photographs with no captions.
6. **Contact** — two named people with phone numbers; the reference has an address only.

Conversely, the reference footer's address (**Admirala Geprata 10, Beograd**) appears
nowhere in the deck. Confirm it is current.

## 5. Photography

The register is completely different from the reference's assets, and this has design
consequences.

The reference used seven studio-lit 1024×1024 shots — single plated dessert, soft window
light, cream backdrop — which is what its tall 4:5 card with a dark gradient scrim was
designed around. The deck's photographs are real production shots: trays on baking paper,
kitchen counters, hands, a phone camera. Dimensions run from 376×640 to 2168×610. Several
are pale desserts on pale surfaces.

Consequences to carry into Phase 2:

- The `from-ink/75` gradient scrim assumes a dark photo bottom. On a cream cheesecake on a
  white plate it will not deliver readable white text. The card needs a **guaranteed**
  contrast floor under its caption, not a gradient that hopes.
- Cropping to a single ratio is unavoidable, and several images will not survive a 4:5
  crop. A squarer card (4:3 or 1:1) loses less.
- A consistent treatment — fixed warm background fill behind transparent-edge crops, or a
  subtle inset frame — will do more for coherence than any amount of grid work.

### Best-guess mapping (needs confirmation)

| Image | Likely product | Confidence |
|---|---|---|
| `image5.png` | Čizkejk Citrus | high |
| `image10.jpg`, `image23.jpg` | Limun / Lajm tart | high |
| `image11.jpg`, `image22.jpg` | Brauni | high |
| `image13.jpg`, `image20.jpg` | Čizkejk Jagoda | high |
| `image16.jpg` | Rolnice sa kondenzovanim mlekom | high |
| `image18.jpg` | Oraščići sa kondenzovanim mlekom | high |
| `image12.jpg`, `image25.jpg` | Slana karamela (jars, branded label) | high |
| `image21.jpg` | Čizkejk Njujork (dark glaze) | medium |
| `image24.jpg` | Pita sa višnjama (lattice — reads apple, deck says cherry) | medium |
| `image2/7.jpg` | pale sponge squares on trays — Medovik or Mravinjak | low |
| `image8/14/15.jpg` | cocoa logs with cream dots | low |
| `image17.jpg` | crumb-coated log with cream dots — Mravinjak or Napoleon | low |
| `image4.jpg`, `image19.jpg`, `image26.jpg` | production / lifestyle | n/a |
| `image27.jpg`, `image28.jpg` | takeaway boxes, lifestyle | n/a |
| `image3.jpeg` | café interior — use on About | n/a |
| `image1.png` | **wordmark**: cream `basıc` on black, dotless ı | n/a |

**No photograph found for:** Napoleon, Medovik, Medovik sa malinom, Čokoladna kuglica od
keksa, Sirniki, Vanila sufle u čokoladnoj glazuri, Kolutići sa poslastičarskim kremom,
Kokos karamela. Per instruction, these get another dessert's photo as a placeholder —
tracked in the admin panel as a visible gap rather than silently, so it is obvious which
products still need shooting.

## 6. Open questions

1. **Prices.** The deck has none. Per-piece wholesale price and whole-cake price drive the
   catalogue, the cart and the order total. Blocking for Phase 3.
2. **Founders' names** — see §3. Who are they?
3. **"Napoleon Medovik"** on slide 4 — one hybrid cake, or two lines run together?
4. **Is the address still Admirala Geprata 10?**
5. **Consumer or trade?** Does this site serve venues only, or venues *and* walk-in
   customers? It changes the hero, the CTA, whether prices are public, and whether the
   cart is an order or a quote request. The deck says trade; the reference says both.
6. **Primary CTA** — "send order" (reference) or "request a tasting box" (deck)?
