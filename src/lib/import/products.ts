import "server-only";
import { FORMATS, type Format } from "@/lib/catalog/products";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/i18n/config";
import type { Sheet } from "./xlsx";

/**
 * A price list, read as products.
 *
 * The shop's catalogue already exists — in a spreadsheet, which is where a shop's
 * catalogue always already exists. Typing eighteen products into a form to get
 * started is the kind of work that makes an owner decide the console is not worth
 * using, so the first load is a file.
 *
 * The rules here are forgiving about how a person writes things and strict about
 * what ends up in the table: headers are matched in three languages and in
 * whatever case and spacing they were typed, numbers survive spaces and a decimal
 * comma, storage words are matched by meaning — and then a row either becomes a
 * complete product or becomes an error naming the row number the person sees in
 * their own spreadsheet.
 */

export type ImportIssue = { line: number; message: string };

export type ImportRow = {
  line: number;
  slug: string;
  position: number | null;
  price: number;
  wholePrice: number | null;
  tag: string | null;
  formats: Format[];
  weightG: number | null;
  kcal: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  photo: string | null;
  published: boolean;
  text: Partial<Record<Locale, { name: string; note: string }>>;
};

export const MAX_ROWS = 300;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const TAG_MAX = 24;

/** One canonical name per column, and every spelling that means it. */
const HEADERS: Record<string, string> = {
  slug: "slug",
  sifra: "slug",
  kljuc: "slug",
  kod: "slug",
  id: "slug",
  artikul: "slug",

  position: "position",
  order: "position",
  redosled: "position",
  poziciya: "position",
  pozicia: "position",

  price: "price",
  price_rsd: "price",
  cena: "price",
  cena_rsd: "price",
  cena_komad: "price",
  tsena: "price",

  whole_price: "whole_price",
  whole_price_rsd: "whole_price",
  cena_cela_torta: "whole_price",
  cela_torta: "whole_price",
  tsena_tselogo: "whole_price",

  tag: "tag",
  oznaka: "tag",
  teg: "tag",
  metka: "tag",

  formats: "formats",
  format: "formats",
  storage: "formats",
  cuvanje: "formats",
  hranjenje: "formats",
  hranenie: "formats",

  weight: "weight",
  weight_g: "weight",
  masa: "weight",
  masa_g: "weight",
  ves: "weight",
  ves_g: "weight",

  kcal: "kcal",
  energy: "kcal",
  kalorije: "kcal",
  kkal: "kcal",

  protein: "protein",
  protein_g: "protein",
  proteini: "protein",
  belki: "protein",

  fat: "fat",
  fat_g: "fat",
  masti: "fat",
  zhiry: "fat",

  carbs: "carbs",
  carbs_g: "carbs",
  carbohydrate: "carbs",
  ugljeni_hidrati: "carbs",
  uglevody: "carbs",

  photo: "photo",
  photo_file: "photo",
  slika: "photo",
  foto: "photo",

  published: "published",
  live: "published",
  objavljeno: "published",
  opublikovano: "published",
  aktivno: "published",
};

/** Storage words, by what they mean rather than by how they are spelled. */
const FORMAT_WORDS: [RegExp, Format][] = [
  [/^(chilled|fridge|cold|hladno|rashladjeno|frizider|vitrina|holod|ohlazh|holodil)/, "chilled"],
  [/^(frozen|freezer|smrznuto|zamrznuto|morozil|zamorozh)/, "frozen"],
  [/^(ambient|room|shelf|sobna|sobnoj|polica|komnat|obychn)/, "ambient"],
];

const YES = /^(1|y|yes|true|da|de|ye|da\b|д|da|истина)$/i;
const NO = /^(0|n|no|false|ne|нет|net|ложь)$/i;

export function parseProducts(sheet: Sheet): { rows: ImportRow[]; issues: ImportIssue[] } {
  const issues: ImportIssue[] = [];
  const rows: ImportRow[] = [];

  const headerIndex = sheet.rows.findIndex((cells) =>
    cells.some(
      (cell) => HEADERS[normalize(cell)] === "slug" || HEADERS[normalize(cell)] === "price",
    ),
  );

  if (headerIndex < 0) {
    return {
      rows: [],
      issues: [
        {
          line: 1,
          message:
            "No header row — the first row has to name the columns. Start from the template.",
        },
      ],
    };
  }

  const columns = mapColumns(sheet.rows[headerIndex] ?? []);
  if (columns.price === undefined) {
    issues.push({
      line: headerIndex + 1,
      message: "No price column. Expected one headed “price_rsd”.",
    });
  }
  if (!LOCALES.some((locale) => columns[`name_${locale}`] !== undefined)) {
    issues.push({
      line: headerIndex + 1,
      message: `No name column. Expected at least “name_${DEFAULT_LOCALE}”.`,
    });
  }
  if (issues.length > 0) return { rows: [], issues };

  const seen = new Map<string, number>();

  for (let i = headerIndex + 1; i < sheet.rows.length; i += 1) {
    const cells = sheet.rows[i] ?? [];
    const line = i + 1;
    const at = (key: string) => {
      const index = columns[key];
      return index === undefined ? "" : (cells[index] ?? "").trim();
    };

    // A blank row is where the person stopped typing, not an error.
    if (cells.every((cell) => cell.trim() === "")) continue;

    if (rows.length >= MAX_ROWS) {
      issues.push({
        line,
        message: `More than ${MAX_ROWS} rows — split the file and import it in parts.`,
      });
      break;
    }

    const text: ImportRow["text"] = {};
    for (const locale of LOCALES) {
      const name = at(`name_${locale}`);
      if (name) text[locale] = { name, note: at(`note_${locale}`) };
    }

    const defaultName = text[DEFAULT_LOCALE]?.name;
    if (!defaultName) {
      issues.push({
        line,
        message: `Needs a ${DEFAULT_LOCALE.toUpperCase()} name — every other language falls back to it.`,
      });
      continue;
    }

    const slug = at("slug") ? normalizeSlug(at("slug")) : slugify(defaultName);
    if (!SLUG.test(slug)) {
      issues.push({
        line,
        message: `“${at("slug")}” is not a usable slug — lowercase letters, digits and single hyphens.`,
      });
      continue;
    }
    const first = seen.get(slug);
    if (first !== undefined) {
      issues.push({ line, message: `The slug “${slug}” is already used on row ${first}.` });
      continue;
    }

    const price = number(at("price"));
    if (price === null || !Number.isInteger(price) || price < 0) {
      issues.push({
        line,
        message: `“${at("price")}” is not a price — whole dinars, digits only.`,
      });
      continue;
    }

    const wholePrice = number(at("whole_price"));
    if (
      at("whole_price") &&
      (wholePrice === null || !Number.isInteger(wholePrice) || wholePrice < 0)
    ) {
      issues.push({ line, message: `“${at("whole_price")}” is not a whole-cake price.` });
      continue;
    }

    const formats = parseFormats(at("formats"));
    if (formats.length === 0) {
      issues.push({
        line,
        message: at("formats")
          ? `“${at("formats")}” is not a way of keeping something — use chilled, frozen or ambient.`
          : "No storage — say chilled, frozen or ambient. It is what the catalogue filters on.",
      });
      continue;
    }

    const tag = at("tag").slice(0, TAG_MAX);
    const weightG = number(at("weight"));
    const macros = {
      kcal: number(at("kcal")),
      protein: number(at("protein")),
      fat: number(at("fat")),
      carbs: number(at("carbs")),
    };
    const given = Object.values(macros).filter((value) => value !== null).length;
    if (given > 0 && given < 4) {
      issues.push({
        line,
        message:
          "A declaration needs all four figures — energy, protein, fat and carbohydrate — or none.",
      });
      continue;
    }

    const publishedCell = at("published");
    const published = publishedCell === "" ? true : !NO.test(publishedCell);
    if (publishedCell !== "" && !YES.test(publishedCell) && !NO.test(publishedCell)) {
      issues.push({
        line,
        message: `“${publishedCell}” is not a yes or a no in the published column.`,
      });
      continue;
    }

    seen.set(slug, line);
    rows.push({
      line,
      slug,
      position: number(at("position")),
      price,
      wholePrice: at("whole_price") ? wholePrice : null,
      tag: tag || null,
      formats,
      weightG,
      kcal: macros.kcal,
      protein: macros.protein,
      fat: macros.fat,
      carbs: macros.carbs,
      photo: at("photo") || null,
      published,
      text,
    });
  }

  if (rows.length === 0 && issues.length === 0) {
    issues.push({
      line: headerIndex + 1,
      message: "The file has a header and no products under it.",
    });
  }

  return { rows, issues };
}

function mapColumns(header: string[]): Record<string, number> {
  const columns: Record<string, number> = {};

  header.forEach((cell, index) => {
    const key = normalize(cell);
    if (!key) return;

    // `name_ru`, `naziv_sr`, `opis_en` — the language is the suffix, whatever the
    // word in front of it was.
    const localised =
      /^(name|naziv|naslov|imya|nazvanie|имя|название|назив|note|opis|description|primechanie|примечание|описание|opis)_([a-z]{2})$/.exec(
        key,
      );
    if (localised) {
      const [, word, locale] = localised;
      if ((LOCALES as readonly string[]).includes(locale!)) {
        const field = /^(note|opis|description|primechanie|примечание|описание)$/.test(word!)
          ? "note"
          : "name";
        columns[`${field}_${locale}`] = index;
        return;
      }
    }

    const canonical = HEADERS[key];
    if (canonical && columns[canonical] === undefined) columns[canonical] = index;
  });

  return columns;
}

/** Lower case, accents off, everything that is not a letter or digit to `_`. */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9а-я]+/gi, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * A number as a person writes it: "1 250", "1.250,50", "450 RSD".
 *
 * The separators are ambiguous on their own — `1.250` is a thousand and a bit in
 * Belgrade and one and a quarter in London — so the rule is the one Excel itself
 * uses when it exports: whichever separator comes last is the decimal one.
 */
function number(value: string): number | null {
  const cleaned = value.replace(/[^\d.,-]/g, "").trim();
  if (!cleaned) return null;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalized = cleaned;

  if (lastComma >= 0 && lastDot >= 0) {
    const decimal = lastComma > lastDot ? "," : ".";
    const thousands = decimal === "," ? "." : ",";
    normalized = cleaned.split(thousands).join("").replace(decimal, ".");
  } else if (lastComma >= 0) {
    // A lone separator with exactly three digits behind it is a thousands
    // separator, whichever of the two it is — "1.250" and "1,250" are both 1250
    // to the person who typed them, and neither is one and a quarter dinars.
    normalized = /,\d{3}$/.test(cleaned) ? cleaned.replace(/,/g, "") : cleaned.replace(",", ".");
  } else if (/\.\d{3}$/.test(cleaned)) {
    normalized = cleaned.replace(/\./g, "");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseFormats(value: string): Format[] {
  const found = new Set<Format>();

  for (const word of value.split(/[,;/|]+|\s{2,}|\s+/)) {
    const key = normalize(word);
    if (!key) continue;
    // "whole" is a variant of a cake, not a way of keeping one — it is set by
    // the whole-cake price, so a column that says it is ignored rather than
    // refused.
    if (key === "whole" || key === "cela" || key === "tselyy") continue;

    const match = FORMAT_WORDS.find(([pattern]) => pattern.test(key));
    if (match) found.add(match[1]);
  }

  return FORMATS.filter((format) => found.has(format));
}

function normalizeSlug(value: string): string {
  return slugify(value);
}

/**
 * A slug from a name, so nobody has to invent one.
 *
 * Serbian latin loses its diacritics the way the search box already folds them,
 * and Cyrillic is transliterated — the same name typed in either script has to
 * land on the same slug, because the two are the same product.
 */
const CYRILLIC: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "z",
  з: "z",
  и: "i",
  й: "j",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "c",
  ч: "c",
  ш: "s",
  щ: "s",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "u",
  я: "a",
  ђ: "d",
  ј: "j",
  љ: "lj",
  њ: "nj",
  ћ: "c",
  џ: "dz",
};

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .split("")
    .map((character) => CYRILLIC[character] ?? character)
    .join("")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
