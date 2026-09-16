import type { PluralForms } from "../format";

/** Identity helper: annotates a plural entry so translations may add `few`/`many`. */
const p = (forms: PluralForms): PluralForms => forms;

/**
 * English is the source of truth. `Messages` is inferred from this object, so
 * every other locale must match it exactly — a missing key is a type error and
 * therefore a build failure, never a raw key on screen and never a silent fallback.
 *
 * One key holds one whole sentence. Placeholders are `{name}`.
 */
export const en = {
  meta: {
    title: "basic — desserts for your venue",
    description:
      "Small-batch desserts supplied to cafés and restaurants in Belgrade and Novi Sad.",
  },
  nav: {
    catalog: "Catalog",
    order: "Order",
    business: "For business",
    skipToContent: "Skip to content",
    home: "basic — home",
    primary: "Primary",
    openMenu: "Menu",
    closeMenu: "Close menu",
    cta: "Order sweets",
    tagline: "coffee & breakfast",
  },
  hero: {
    location: "Admirala Geprata 10, Belgrade",
    headlineTop: "coffee & breakfast.",
    headlineBottom: "sweet things.",
    lead: "A small neighbourhood café for slow mornings, good coffee and breakfast all day. Everything sweet is made here in small batches — from familiar favourites to whole cakes.",
    ctaPrimary: "Explore desserts",
    ctaSecondary: "You're a business? Contact us",
    scrollCue: "made here, every morning",
  },
  catalog: {
    eyebrow: "The range",
    title: "The",
    titleAccent: "catalog",
    lead: "Hover a piece to see how it keeps, then add it to your order.",
    leadTouch: "Tap a piece for the details, then add it to your order.",
    all: "Everything",
    add: "Add to order",
    addWhole: "Add whole cake",
    addOne: "Add one",
    removeOne: "Remove one",
    piece: "Piece",
    wholeCake: "Whole",
    onRequest: "on request",
    empty: "Nothing in this group yet.",
    emptyHint: "Pick another group above.",
    filterLabel: "Filter by how it keeps",
    weight: "Weight",
    nutritionTitle: "Nutrition",
    per100: "per 100 g",
    kcal: "Energy",
    protein: "Protein",
    fat: "Fat",
    carbs: "Carbohydrate",
    nutritionNote: "Provisional figures. The kitchen has not measured these yet.",
    storage: "How it keeps",
  },
  formats: {
    whole: "Whole cakes",
    frozen: "Frozen",
    chilled: "Chilled display",
    ambient: "Room temperature",
  },
  /** The same four, at chip length. A filter tab can afford a sentence; a chip
      on a 165px card cannot. */
  formatsShort: {
    whole: "Whole",
    frozen: "Frozen",
    chilled: "Chilled",
    ambient: "Room temp",
  },
  delivery: {
    eyebrow: "Good to know",
    title: "Delivery, kept",
    titleAccent: "simple.",
    lead: "Pick your city for the essentials. Open the details only if you need them.",
    area: "Delivery area",
    minimum: "Minimum order",
    fee: "Delivery",
    schedule: "Schedule",
    more: "A few more details",
    less: "Hide details",
    cities: [
      {
        slug: "belgrade",
        name: "Belgrade",
        minimum: "3.000 RSD",
        fee: "300 RSD to outer areas",
        schedule: "Mon–Sat, by 12:00",
        details: [
          "Order at least two days ahead — you can plan the whole week at once.",
          "Urgent orders may be possible from the current range.",
          "Pickup from the city centre comes with a discount.",
          "Deferred payment up to 10 days can be arranged.",
          "Payment by invoice with VAT; a declaration comes with every delivery.",
        ],
      },
      {
        slug: "novi-sad",
        name: "Novi Sad",
        minimum: "15.000 RSD",
        fee: "300 RSD to your venue",
        schedule: "Once a week",
        details: [
          "Order at least two days ahead.",
          "Orders can be planned for a full week or month.",
          "We agree the weekly delivery day with you.",
          "Deferred payment up to 10 days can be arranged.",
          "Payment by invoice with VAT; a declaration comes with every delivery.",
        ],
      },
    ],
  },
  order: {
    eyebrow: "Ordering",
    title: "Place your",
    titleAccent: "order",
    lead: "Freshly made and packed for the trip. Please order at least two days ahead.",
    urgent: "Urgent orders by arrangement",
    deferred: "Deferred payment up to 10 days can be arranged",
    detailsTitle: "Your details",
    cartTitle: "Your box",
    cartItems: "Items in your order",
    cartEmpty: "Nothing here yet — pick something from the catalog above.",
    each: "{price} each",
    lineWhole: "{name} — whole cake",
    addOne: "Add one: {name}",
    removeOne: "Remove one: {name}",
    lineQuantity: "Quantity: {name}",
    total: "Total",
    clear: "Clear the box",
    submit: "Send order",
    submitTotal: "Send order · {total}",
    submitHint: "Add at least one dessert to send the order.",
    sending: "Sending…",
    sent: "Order received — we'll confirm by phone shortly.",
    failed: "The order didn't send. Please try again.",
    barLabel: "Go to the order form",
    barSummary: "{count} · {total}",
    barCheckout: "Checkout",
    fields: {
      venue: { label: "Venue", placeholder: "Café or restaurant" },
      contact: { label: "Contact person", placeholder: "Who should we ask for?" },
      phone: { label: "Phone", placeholder: "+381 …" },
      email: {
        label: "Email",
        placeholder: "orders@venue.rs",
        help: "Only if you want the invoice by mail.",
      },
      city: { label: "City", placeholder: "Choose a city" },
      date: { label: "Delivery date", help: "Two days from today at the earliest." },
      comment: {
        label: "Anything else?",
        placeholder: "Delivery time, packing, a note for the kitchen.",
      },
    },
  },
  locale: {
    label: "Language",
    switchTo: "Switch to {language}",
  },
  units: {
    pieces: p({ one: "{count} piece", other: "{count} pieces" }),
  },
  error: {
    notFoundTitle: "Page not found",
    notFoundBody: "The page you were looking for doesn't exist or has moved.",
    genericTitle: "This page didn't load",
    genericBody: "Something went wrong on our end. Try again, or head back home.",
    retry: "Try again",
    home: "Go home",
  },
};

export type Messages = typeof en;
