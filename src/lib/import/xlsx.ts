import "server-only";
import { inflateRawSync } from "node:zlib";

/**
 * Reading a spreadsheet, without a spreadsheet library.
 *
 * An .xlsx is a zip of XML: a table of shared strings and one XML document per
 * sheet. Node can already do the hard half — `zlib` inflates the entries — and
 * the half that is left is reading a container format and pulling values out of
 * about six tags. That is a couple of hundred lines against a dependency (and its
 * own dependencies) that would ship into every build of this project for the sake
 * of one screen the owner uses once.
 *
 * Deliberately narrow: the first worksheet, cell values, and nothing else. No
 * formulas, no styles, no dates, no charts. A price list is text and numbers, and
 * anything cleverer than that in the file is not a product.
 */

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;

/** The entries of a zip, by name. Only what this module needs is inflated. */
function unzip(source: Buffer, wanted: (name: string) => boolean): Map<string, Buffer> {
  const eocd = findEocd(source);
  if (eocd < 0) throw new ImportError("not_a_spreadsheet");

  const count = source.readUInt16LE(eocd + 10);
  let offset = source.readUInt32LE(eocd + 16);
  const files = new Map<string, Buffer>();

  for (let i = 0; i < count; i += 1) {
    if (source.readUInt32LE(offset) !== CENTRAL_SIGNATURE)
      throw new ImportError("not_a_spreadsheet");

    const method = source.readUInt16LE(offset + 10);
    const compressed = source.readUInt32LE(offset + 20);
    const nameLength = source.readUInt16LE(offset + 28);
    const extraLength = source.readUInt16LE(offset + 30);
    const commentLength = source.readUInt16LE(offset + 32);
    const localOffset = source.readUInt32LE(offset + 42);
    const name = source.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");

    if (wanted(name)) {
      // The local header repeats the name and may carry a different amount of
      // extra data than the central one — so the payload is found through it,
      // never by assuming the two agree.
      const localNameLength = source.readUInt16LE(localOffset + 26);
      const localExtraLength = source.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + localNameLength + localExtraLength;
      const raw = source.subarray(start, start + compressed);
      files.set(name, method === 0 ? Buffer.from(raw) : inflateRawSync(raw));
    }

    offset += 46 + nameLength + extraLength + commentLength;
  }

  return files;
}

/** The end-of-central-directory record, scanned for from the back past a comment. */
function findEocd(source: Buffer): number {
  const earliest = Math.max(0, source.length - 0xffff - 22);
  for (let i = source.length - 22; i >= earliest; i -= 1) {
    if (source.readUInt32LE(i) === EOCD_SIGNATURE) return i;
  }
  return -1;
}

/** A failure the person can act on, rather than a stack trace about offsets. */
export class ImportError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.code = code;
    this.name = "ImportError";
  }
}

export type Sheet = { rows: string[][] };

export function readXlsx(bytes: ArrayBuffer): Sheet {
  const source = Buffer.from(bytes);
  const files = unzip(
    source,
    (name) => name === "xl/sharedStrings.xml" || /^xl\/worksheets\/sheet\d+\.xml$/.test(name),
  );

  const sheetName = [...files.keys()].filter((name) => name.startsWith("xl/worksheets/")).sort()[0];
  if (!sheetName) throw new ImportError("no_sheet");

  const shared = sharedStrings(files.get("xl/sharedStrings.xml"));
  return { rows: parseSheet(files.get(sheetName)!.toString("utf8"), shared) };
}

/**
 * The shared string table.
 *
 * Excel stores every distinct piece of text once and refers to it by index; a
 * single string can be several `<t>` runs when part of it was styled differently,
 * so the runs of one `<si>` are joined rather than taken as separate strings.
 */
function sharedStrings(file: Buffer | undefined): string[] {
  if (!file) return [];
  const xml = file.toString("utf8");
  const out: string[] = [];

  for (const [, item] of xml.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)) {
    let text = "";
    for (const [, run] of (item ?? "").matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) {
      text += unescapeXml(run ?? "");
    }
    out.push(text);
  }
  return out;
}

function parseSheet(xml: string, shared: string[]): string[][] {
  const rows: string[][] = [];

  for (const [, attributes, body] of xml.matchAll(/<row(\s[^>]*)?>([\s\S]*?)<\/row>/g)) {
    const declared = Number(/\sr="(\d+)"/.exec(attributes ?? "")?.[1] ?? 0);
    const cells: string[] = [];

    for (const [, cellAttributes, cellBody] of (body ?? "").matchAll(
      /<c(\s[^>]*?)?(?:\/>|>([\s\S]*?)<\/c>)/g,
    )) {
      const reference = /\sr="([A-Z]+)\d+"/.exec(cellAttributes ?? "")?.[1];
      const type = /\st="([^"]+)"/.exec(cellAttributes ?? "")?.[1];
      const index = reference ? columnIndex(reference) : cells.length;

      // Empty cells are skipped in the file, not written as blanks — so a row is
      // laid out by cell reference, and the holes are filled in afterwards.
      while (cells.length < index) cells.push("");
      cells[index] = cellValue(type, cellBody ?? "", shared);
    }

    // A row can be skipped in the file too. The blanks matter: the row number in
    // an error message has to be the row number the person sees in Excel.
    if (declared > 0) while (rows.length < declared - 1) rows.push([]);
    rows.push(cells);
  }

  return rows;
}

function cellValue(type: string | undefined, body: string, shared: string[]): string {
  if (type === "inlineStr") {
    let text = "";
    for (const [, run] of body.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) {
      text += unescapeXml(run ?? "");
    }
    return text.trim();
  }

  const raw = /<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/.exec(body)?.[1];
  if (raw === undefined) return "";
  const value = unescapeXml(raw).trim();

  if (type === "s") return shared[Number(value)] ?? "";
  // A checkbox cell is stored as 0 or 1; a lookup rather than a ternary keeps
  // the project's "never branch on a number" rule honest.
  if (type === "b") return BOOLEANS[value] ?? value;
  return value;
}

const BOOLEANS: Record<string, string> = { "0": "false", "1": "true" };

/** "AB" → 27. Base-26 with no zero, which is why it is not just `parseInt`. */
function columnIndex(reference: string): number {
  let index = 0;
  for (const character of reference) index = index * 26 + (character.charCodeAt(0) - 64);
  return index - 1;
}

function unescapeXml(value: string): string {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, "&");
}

/**
 * The other half of "a spreadsheet".
 *
 * Every spreadsheet program on earth also writes CSV, and someone will export
 * one. Quoted fields, doubled quotes inside them, newlines inside them, a BOM in
 * front of them, and semicolons instead of commas — which is what Excel writes on
 * a machine whose decimal separator is a comma, and therefore what a Serbian
 * Windows will hand over.
 */
export function readCsv(text: string): Sheet {
  const source = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const delimiter = chooseDelimiter(source);

  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < source.length; i += 1) {
    const character = source[i];

    if (quoted) {
      if (character === '"') {
        if (source[i + 1] === '"') {
          value += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        value += character;
      }
      continue;
    }

    if (character === '"') quoted = true;
    else if (character === delimiter) {
      row.push(value);
      value = "";
    } else if (character === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else value += character;
  }

  if (value !== "" || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  return { rows: rows.map((cells) => cells.map((cell) => cell.trim())) };
}

/** Whichever separator appears more often outside quotes on the first line. */
function chooseDelimiter(source: string): "," | ";" | "\t" {
  const first = source.slice(0, source.indexOf("\n") + 1 || undefined);
  const counts = { ",": 0, ";": 0, "\t": 0 };
  let quoted = false;

  for (const character of first) {
    if (character === '"') quoted = !quoted;
    else if (!quoted && character in counts) counts[character as keyof typeof counts] += 1;
  }

  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ",") as "," | ";" | "\t";
}

/** Reads whichever of the two it was handed. */
export function readSheet(bytes: ArrayBuffer): Sheet {
  const head = Buffer.from(bytes.slice(0, 4));
  const isZip = head[0] === 0x50 && head[1] === 0x4b;

  if (isZip) return readXlsx(bytes);

  const text = Buffer.from(bytes).toString("utf8");
  // An .xls from before 2007 is a compound-file binary, not text and not a zip.
  if (text.charCodeAt(0) === 0xd0 || text.includes("\u0000")) {
    throw new ImportError("old_xls");
  }
  return readCsv(text);
}
