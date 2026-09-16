import type { Locale } from "@/lib/i18n/config";

/**
 * The catalogue.
 *
 * Names come from the summer 2026 price list; photographs come from the deck.
 * Prices are the **recommended venue retail price** — the column you pointed at,
 * not either b2b column — taken as a single figure at the middle of each range and
 * rounded to the nearest 10, since the sheet quotes ranges and a card shows one
 * number. The two products the sheet leaves blank carry a stand-in, marked below.
 *
 * Storage formats come from the sheet's own storage and shelf-life columns rather
 * than a guess: a café with no display case needs to filter to what survives on a
 * counter, and that is this catalogue's primary navigation.
 *
 * Still a fixture, not the data layer. The shape is what a
 * `products` + `product_translations` read will return, so swapping it for a query
 * changes one function and no component.
 */

export const FORMATS = ["whole", "frozen", "chilled", "ambient"] as const;
export type Format = (typeof FORMATS)[number];

export type Product = {
  slug: string;
  name: Record<Locale, string>;
  /** One sentence. Placeholder copy until the kitchen writes its own. */
  note: Record<Locale, string>;
  formats: Format[];
  /** RSD, per piece. */
  price: number;
  /** True where the sheet had no venue price and this is a stand-in. */
  priceIsPlaceholder: boolean;
  /** Also sold as a whole cake. */
  whole: boolean;
  /** The photograph belongs to a different product — a gap, kept visible in the data. */
  photoIsPlaceholder: boolean;
  /** Grams. A piece weight, or the weight of the whole cake for the whole rows. */
  weightG: number;
  /** Per 100g. Mocked until the kitchen measures — see NUTRITION. */
  nutrition: Nutrition;
};

export type Nutrition = {
  kcal: number;
  /** Grams per 100g. */
  protein: number;
  fat: number;
  carbs: number;
};

/**
 * The piece/whole toggle survives only for the two cheesecakes.
 *
 * The deck lists them among the whole cakes but the price sheet has no whole-cake
 * row for either, so they carry the agreed piece price × 6. Medovik and napoleon do
 * have their own rows — and napoleon has two weights, which a boolean toggle cannot
 * express — so those are products in their own right, at the sheet's real prices.
 */
export const WHOLE_MULTIPLIER = 6;

type Row = {
  slug: string;
  sr: [string, string];
  ru: [string, string];
  en: [string, string];
  formats: Format[];
  price: number;
  whole?: boolean;
  priceIsPlaceholder?: boolean;
  photoIsPlaceholder?: boolean;
};

/**
 * Weight and nutrition, per product.
 *
 * **Mocked.** These are plausible figures for the kind of thing each product is,
 * not measurements — the kitchen has not weighed anything yet, and a declaration
 * that goes out with a delivery cannot be built on a guess. They live in their own
 * table rather than in `ROWS` so that replacing them with real numbers is one
 * object to edit and nothing else to touch.
 *
 * `weightG` is the weight of one piece, except on the whole-cake rows where it is
 * the cake. Everything else is per 100g, which is how a declaration states it.
 */
const FACTS: Record<string, { weightG: number; nutrition: Nutrition }> = {
  "cizkejk-njujork": { weightG: 130, nutrition: { kcal: 341, protein: 5.8, fat: 23.1, carbs: 27.4 } },
  "cizkejk-mandarina": { weightG: 135, nutrition: { kcal: 318, protein: 5.5, fat: 20.4, carbs: 28.9 } },
  medovik: { weightG: 120, nutrition: { kcal: 362, protein: 4.9, fat: 19.7, carbs: 41.8 } },
  napoleon: { weightG: 125, nutrition: { kcal: 384, protein: 5.2, fat: 24.6, carbs: 35.1 } },
  "medovik-cela-torta": { weightG: 2500, nutrition: { kcal: 362, protein: 4.9, fat: 19.7, carbs: 41.8 } },
  "napoleon-cela-torta-2700": { weightG: 2700, nutrition: { kcal: 384, protein: 5.2, fat: 24.6, carbs: 35.1 } },
  "napoleon-cela-torta-1300": { weightG: 1300, nutrition: { kcal: 384, protein: 5.2, fat: 24.6, carbs: 35.1 } },
  "limun-tart": { weightG: 110, nutrition: { kcal: 336, protein: 4.4, fat: 18.9, carbs: 37.2 } },
  "tart-bobice": { weightG: 115, nutrition: { kcal: 309, protein: 4.1, fat: 16.8, carbs: 35.6 } },
  "pticje-mleko": { weightG: 95, nutrition: { kcal: 298, protein: 4.7, fat: 15.2, carbs: 36.4 } },
  kolutici: { weightG: 80, nutrition: { kcal: 412, protein: 5.6, fat: 22.3, carbs: 47.1 } },
  kartoska: { weightG: 90, nutrition: { kcal: 398, protein: 5.1, fat: 21.7, carbs: 45.3 } },
  mravinjak: { weightG: 85, nutrition: { kcal: 437, protein: 5.3, fat: 26.8, carbs: 45.9 } },
  "morkovni-keks": { weightG: 105, nutrition: { kcal: 352, protein: 5.4, fat: 19.1, carbs: 40.2 } },
  brauni: { weightG: 100, nutrition: { kcal: 431, protein: 6.2, fat: 27.4, carbs: 41.6 } },
  rolnice: { weightG: 75, nutrition: { kcal: 389, protein: 5.9, fat: 21.4, carbs: 43.7 } },
  orascici: { weightG: 70, nutrition: { kcal: 456, protein: 6.8, fat: 28.9, carbs: 43.1 } },
  sirniki: { weightG: 140, nutrition: { kcal: 271, protein: 11.3, fat: 12.6, carbs: 28.4 } },
};

const FALLBACK_FACTS = { weightG: 100, nutrition: { kcal: 350, protein: 5, fat: 20, carbs: 38 } };

const ROWS: Row[] = [
  {
    slug: "cizkejk-njujork",
    sr: ["Čizkejk Njujork", "Gust i kremast, na podlozi od keksa."],
    ru: ["Чизкейк Нью-Йорк", "Плотный и сливочный, на песочной основе."],
    en: ["New York cheesecake", "Dense and creamy, on a biscuit base."],
    formats: ["chilled", "whole"],
    price: 570,
    whole: true,
  },
  {
    slug: "cizkejk-mandarina",
    sr: ["Čizkejk mandarina", "Sa svežom mandarinom i listićima nane."],
    ru: ["Чизкейк мандарин", "Со свежим мандарином и листьями мяты."],
    en: ["Mandarin cheesecake", "With fresh mandarin and mint leaves."],
    formats: ["chilled", "whole"],
    price: 570,
    whole: true,
  },
  {
    slug: "medovik",
    sr: ["Medovik", "Tanki medeni korovi sa kremom od pavlake."],
    ru: ["Медовик", "Тонкие медовые коржи со сметанным кремом."],
    en: ["Medovik honey cake", "Thin honey layers with sour cream."],
    formats: ["chilled", "frozen"],
    price: 450,
  },
  {
    slug: "napoleon",
    sr: ["Napoleon", "Lisnato testo i vanila krem, klasika."],
    ru: ["Наполеон", "Слоёное тесто и заварной крем, классика."],
    en: ["Napoleon", "Puff pastry and vanilla custard, the classic."],
    formats: ["chilled", "frozen"],
    price: 410,
  },
  {
    slug: "medovik-cela-torta",
    sr: ["Medovik, cela torta", "Ceo medovik, uz prethodni dogovor."],
    ru: ["Медовик, целый торт", "Целый медовик, по предварительному согласованию."],
    en: ["Medovik, whole cake", "The whole medovik, by prior arrangement."],
    formats: ["whole", "chilled", "frozen"],
    price: 5600,
    photoIsPlaceholder: true,
  },
  {
    slug: "napoleon-cela-torta-2700",
    sr: ["Napoleon, cela torta", "Za veće događaje i punu salu."],
    ru: ["Наполеон, целый торт", "Для больших событий и полного зала."],
    en: ["Napoleon, whole cake", "For larger events and a full room."],
    formats: ["whole", "chilled", "frozen"],
    price: 7800,
    photoIsPlaceholder: true,
  },
  {
    slug: "napoleon-cela-torta-1300",
    sr: ["Napoleon, cela torta", "Manja cela torta, za kamerniji sto."],
    ru: ["Наполеон, целый торт", "Торт поменьше — для небольшого стола."],
    en: ["Napoleon, whole cake", "A smaller whole cake, for a smaller table."],
    formats: ["whole", "chilled", "frozen"],
    price: 3800,
    priceIsPlaceholder: true,
    photoIsPlaceholder: true,
  },
  {
    slug: "limun-tart",
    sr: ["Limun tart", "Prhka korpica, limun krem i beze."],
    ru: ["Лимонный тарт", "Песочная корзинка, лимонный курд и меренга."],
    en: ["Lemon tart", "Shortcrust, lemon curd and meringue."],
    formats: ["chilled"],
    price: 460,
  },
  {
    slug: "tart-bobice",
    sr: ["Tart sa bobicama", "Prhka korpica sa kremom i sezonskim bobicama."],
    ru: ["Ягодный тарт", "Песочная корзинка с кремом и сезонными ягодами."],
    en: ["Berry tart", "Shortcrust with cream and seasonal berries."],
    formats: ["ambient"],
    price: 460,
    photoIsPlaceholder: true,
  },
  {
    slug: "pticje-mleko",
    sr: ["Ptičje mleko", "Vanila sufle u tamnoj čokoladnoj glazuri."],
    ru: ["Птичье молоко", "Ванильное суфле в тёмной шоколадной глазури."],
    en: ["Bird's milk soufflé", "Vanilla soufflé in a dark chocolate glaze."],
    formats: ["chilled"],
    price: 450,
    photoIsPlaceholder: true,
  },
  {
    slug: "kolutici",
    sr: ["Kolutići sa kremom", "Princes testo, krem i malina ili višnja."],
    ru: ["Заварные колечки", "Заварное тесто, крем и малина или вишня."],
    en: ["Choux rings", "Choux pastry, cream and raspberry or cherry."],
    formats: ["chilled"],
    price: 410,
    photoIsPlaceholder: true,
  },
  {
    slug: "kartoska",
    sr: ["Čokoladna kuglica", "Od mlevenog keksa, kakaa i putera."],
    ru: ["Картошка", "Из молотого печенья, какао и масла."],
    en: ["Chocolate biscuit ball", "Ground biscuit, cocoa and butter."],
    formats: ["chilled", "frozen"],
    price: 340,
  },
  {
    slug: "mravinjak",
    sr: ["Mravinjak", "Mrvice prhkog testa sa kuvanim kondenzovanim mlekom."],
    ru: ["Муравейник", "Песочная крошка с варёной сгущёнкой."],
    en: ["Mravinjak", "Shortcrust crumbs with dulce de leche."],
    formats: ["chilled", "frozen"],
    price: 280,
    photoIsPlaceholder: true,
  },
  {
    slug: "morkovni-keks",
    sr: ["Kolač od šargarepe", "Vlažan, sa orasima i začinima."],
    ru: ["Морковный кекс", "Влажный, с грецким орехом и специями."],
    en: ["Carrot cake", "Moist, with walnuts and spices."],
    formats: ["ambient", "frozen"],
    price: 390,
    photoIsPlaceholder: true,
  },
  {
    slug: "brauni",
    sr: ["Brauni", "Gust, na tamnoj čokoladi."],
    ru: ["Брауни", "Плотный, на тёмном шоколаде."],
    en: ["Brownie", "Dense, on dark chocolate."],
    formats: ["ambient"],
    price: 370,
  },
  {
    slug: "rolnice",
    sr: ["Rolnice", "Hrskave, punjene kuvanim kondenzovanim mlekom."],
    ru: ["Трубочки", "Хрустящие, с варёной сгущёнкой."],
    en: ["Wafer rolls", "Crisp, filled with dulce de leche."],
    formats: ["ambient"],
    price: 390,
  },
  {
    slug: "orascici",
    sr: ["Oraščići", "Punjeni kuvanim kondenzovanim mlekom. Od 40 komada."],
    ru: ["Орешки", "С варёной сгущёнкой. От 40 штук."],
    en: ["Walnut cookies", "Filled with dulce de leche. From 40 pieces."],
    formats: ["ambient"],
    price: 100,
  },
  {
    slug: "sirniki",
    sr: ["Sirnici, smrznuti", "Od svežeg sira, peku se na licu mesta."],
    ru: ["Сырники замороженные", "Из творога, жарятся на месте."],
    en: ["Syrniki, frozen", "Curd cheese, fried to order."],
    formats: ["frozen"],
    price: 220,
    priceIsPlaceholder: true,
    photoIsPlaceholder: true,
  },
];

export const PRODUCTS: Product[] = ROWS.map((r) => ({
  slug: r.slug,
  name: { sr: r.sr[0], ru: r.ru[0], en: r.en[0] },
  note: { sr: r.sr[1], ru: r.ru[1], en: r.en[1] },
  formats: r.formats,
  price: r.price,
  priceIsPlaceholder: r.priceIsPlaceholder ?? false,
  whole: r.whole ?? false,
  photoIsPlaceholder: r.photoIsPlaceholder ?? false,
  ...(FACTS[r.slug] ?? FALLBACK_FACTS),
}));
