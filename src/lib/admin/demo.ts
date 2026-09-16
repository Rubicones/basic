import type {
  AdminRow,
  OrderDetail,
  OrderFieldWithTranslations,
  OrderRow,
  ProductWithTranslations,
} from "./types";

/**
 * The console's demo data.
 *
 * It exists so the interface can be shown before the database behind it is
 * filled, and it is shaped to put every state on screen at least once: a live
 * product and a draft, one with no photograph and one whose price is a stand-in,
 * a hidden form field among the visible ones, and an order in each of the four
 * statuses. A demo where everything is in its happy state demonstrates nothing.
 *
 * Photographs point at the files already in `public/products`, so nothing here
 * needs storage to be configured.
 */

const photo = (file: string) => `/products/${file}`;

function product(
  index: number,
  slug: string,
  sr: [string, string],
  ru: [string, string],
  en: [string, string],
  extra: Partial<ProductWithTranslations>,
): ProductWithTranslations {
  return {
    id: `demo-product-${index}`,
    slug,
    price_rsd: 500,
    price_is_placeholder: false,
    has_whole: false,
    whole_multiplier: 6,
    formats: ["chilled"],
    photo_path: null,
    photo_blur: null,
    photo_is_placeholder: false,
    position: index,
    is_published: true,
    product_translations: [
      { locale: "sr", name: sr[0], note: sr[1] },
      { locale: "ru", name: ru[0], note: ru[1] },
      { locale: "en", name: en[0], note: en[1] },
    ],
    ...extra,
  };
}

export const DEMO_PRODUCTS: ProductWithTranslations[] = [
  product(
    0,
    "cizkejk-njujork",
    ["Čizkejk Njujork", "Gust i kremast, na podlozi od keksa."],
    ["Чизкейк Нью-Йорк", "Плотный и сливочный, на песочной основе."],
    ["New York cheesecake", "Dense and creamy, on a biscuit base."],
    {
      price_rsd: 570,
      has_whole: true,
      formats: ["chilled", "whole"],
      photo_path: photo("cizkejk-njujork-ab7e1395.jpg"),
    },
  ),
  product(
    1,
    "cizkejk-mandarina",
    ["Čizkejk sa mandarinom", "Sa slojem mandarine i malo manje šećera."],
    ["Чизкейк с мандарином", "Со слоем мандарина и чуть меньшим количеством сахара."],
    ["Mandarin cheesecake", "With a mandarin layer and a little less sugar."],
    {
      price_rsd: 590,
      has_whole: true,
      formats: ["chilled", "whole"],
      photo_path: photo("cizkejk-mandarina-f1aa80bf.jpg"),
    },
  ),
  product(
    2,
    "medovik",
    ["Medovik", "Tanki listovi testa sa medom i pavlakom."],
    ["Медовик", "Тонкие медовые коржи со сметанным кремом."],
    ["Medovik", "Thin honey layers with sour-cream filling."],
    { price_rsd: 480, formats: ["chilled", "frozen"], photo_path: photo("medovik-8e813a15.jpg") },
  ),
  product(
    3,
    "limun-tart",
    ["Limun tart", "Oštar limunov krem u prhkoj korpici."],
    ["Лимонный тарт", "Резкий лимонный крем в песочной корзинке."],
    ["Lemon tart", "Sharp lemon curd in a crisp shell."],
    {
      price_rsd: 460,
      formats: ["chilled"],
      photo_path: photo("limun-tart-a7c56ae2.jpg"),
      photo_is_placeholder: true,
    },
  ),
  product(
    4,
    "brauni",
    ["Brauni", "Gust, bez brašna, sa tamnom čokoladom."],
    ["Брауни", "Плотный, без муки, на тёмном шоколаде."],
    ["Brownie", "Dense, flourless, dark chocolate."],
    {
      price_rsd: 320,
      formats: ["ambient"],
      photo_path: photo("brauni-413c2ff4.jpg"),
      price_is_placeholder: true,
    },
  ),
  product(
    5,
    "pavlova-sezonska",
    ["Pavlova, sezonska", "U pripremi — voće se menja sa sezonom."],
    ["Павлова, сезонная", "В работе — фрукты меняются по сезону."],
    ["Seasonal pavlova", "In progress — the fruit changes with the season."],
    { price_rsd: 540, formats: ["chilled"], is_published: false },
  ),
];

function field(
  index: number,
  key: string,
  control: OrderFieldWithTranslations["control"],
  labels: [string, string, string],
  extra: Partial<OrderFieldWithTranslations> = {},
): OrderFieldWithTranslations {
  return {
    id: `demo-field-${index}`,
    key,
    control,
    input_type: control === "input" ? "text" : null,
    options_source: control === "select" ? "cities" : null,
    rows: control === "textarea" ? 3 : null,
    autocomplete: null,
    is_required: true,
    is_wide: false,
    is_enabled: true,
    position: index,
    order_field_translations: [
      { locale: "sr", label: labels[0], placeholder: "", help: "", options: [] },
      { locale: "ru", label: labels[1], placeholder: "", help: "", options: [] },
      { locale: "en", label: labels[2], placeholder: "", help: "", options: [] },
    ],
    ...extra,
  };
}

export const DEMO_FIELDS: OrderFieldWithTranslations[] = [
  field(0, "venue", "input", ["Objekat", "Заведение", "Venue"]),
  field(1, "contact", "input", ["Kontakt osoba", "Контактное лицо", "Contact person"]),
  field(2, "phone", "input", ["Telefon", "Телефон", "Phone"], { input_type: "tel" }),
  field(3, "email", "input", ["Email", "Email", "Email"], {
    input_type: "email",
    is_required: false,
  }),
  field(4, "city", "select", ["Grad", "Город", "City"]),
  field(5, "date", "input", ["Datum isporuke", "Дата доставки", "Delivery date"], {
    input_type: "date",
  }),
  field(6, "packing", "select", ["Pakovanje", "Упаковка", "Packing"], {
    is_required: false,
    options_source: "list",
    order_field_translations: [
      {
        locale: "sr",
        label: "Pakovanje",
        placeholder: "",
        help: "",
        options: ["Po komadu", "Po 6", "U kutiji"],
      },
      {
        locale: "ru",
        label: "Упаковка",
        placeholder: "",
        help: "",
        options: ["Поштучно", "По 6", "В коробке"],
      },
      {
        locale: "en",
        label: "Packing",
        placeholder: "",
        help: "",
        options: ["Per piece", "In sixes", "Boxed"],
      },
    ],
  }),
  field(7, "comment", "textarea", ["Još nešto?", "Что-нибудь ещё?", "Anything else?"], {
    is_required: false,
    is_wide: true,
  }),
  // Hidden, so the list shows what a retired question looks like.
  field(8, "vat_number", "input", ["PIB", "ИНН", "VAT number"], {
    is_required: false,
    is_enabled: false,
  }),
];

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

export const DEMO_ORDERS: OrderRow[] = [
  {
    id: "demo-order-1",
    created_at: hoursAgo(3),
    status: "new",
    locale: "sr",
    total_rsd: 7640,
    notified_at: null,
  },
  {
    id: "demo-order-2",
    created_at: hoursAgo(20),
    status: "confirmed",
    locale: "ru",
    total_rsd: 12400,
    notified_at: hoursAgo(20),
  },
  {
    id: "demo-order-3",
    created_at: hoursAgo(52),
    status: "done",
    locale: "sr",
    total_rsd: 4380,
    notified_at: hoursAgo(52),
  },
  {
    id: "demo-order-4",
    created_at: hoursAgo(74),
    status: "cancelled",
    locale: "en",
    total_rsd: 2960,
    notified_at: hoursAgo(74),
  },
  {
    id: "demo-order-5",
    created_at: hoursAgo(96),
    status: "done",
    locale: "sr",
    total_rsd: 18900,
    notified_at: hoursAgo(96),
  },
];

export const DEMO_ADMINS: AdminRow[] = [
  { user_id: "demo-admin-1", email: "demo@basic.rs", created_at: "2026-06-02T09:12:00.000Z" },
  { user_id: "demo-admin-2", email: "mila@basic.rs", created_at: "2026-07-18T14:40:00.000Z" },
  { user_id: "demo-admin-3", email: "kuhinja@basic.rs", created_at: "2026-09-01T08:05:00.000Z" },
];

export function demoOrder(id: string): OrderDetail | null {
  const order = DEMO_ORDERS.find((row) => row.id === id) ?? DEMO_ORDERS[0];
  if (!order) return null;

  return {
    ...order,
    order_items: [
      {
        id: `${order.id}-1`,
        variant: "piece",
        qty: 6,
        unit_price_rsd: 570,
        name_snapshot: "Čizkejk Njujork",
      },
      {
        id: `${order.id}-2`,
        variant: "whole",
        qty: 1,
        unit_price_rsd: 2880,
        name_snapshot: "Medovik",
      },
      {
        id: `${order.id}-3`,
        variant: "piece",
        qty: 4,
        unit_price_rsd: 460,
        name_snapshot: "Limun tart",
      },
    ],
    order_answers: [
      { field_key: "venue", label_snapshot: "Objekat", value: "Kafeterija Dorćol", position: 0 },
      {
        field_key: "contact",
        label_snapshot: "Kontakt osoba",
        value: "Mila Petrović",
        position: 1,
      },
      { field_key: "phone", label_snapshot: "Telefon", value: "+381 60 123 4567", position: 2 },
      { field_key: "city", label_snapshot: "Grad", value: "Beograd", position: 3 },
      { field_key: "date", label_snapshot: "Datum isporuke", value: "2026-09-19", position: 4 },
      {
        field_key: "comment",
        label_snapshot: "Još nešto?",
        value: "Isporuka do 11:00, pakovanje po 6 komada.",
        position: 5,
      },
    ],
  };
}
