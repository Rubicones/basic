/**
 * A legal document, as data.
 *
 * The privacy policy came as a PDF; the terms and the cookie policy will follow.
 * Each is a list of numbered sections made of a handful of block kinds, so one
 * page component lays out all of them, and adding a document is adding a file —
 * see ./index.ts.
 */

export type LegalBlock =
  /** A paragraph. */
  | string
  /** A paragraph opening with a bold run-in heading. */
  | { lead: string; text: string }
  /** A bulleted list. A leading "Label:" is set in bold. */
  | { list: string[] }
  /** A table with a header row; every row has as many cells as `head`. */
  | { table: { head: string[]; rows: string[][] } }
  /** A tinted aside — an address card, a notice. One line per entry. */
  | { box: string[] };

export type LegalSection = {
  title: string;
  blocks: LegalBlock[];
};

export type LegalDoc = {
  title: string;
  subtitle: string;
  /** ISO date of the last change; formatted per locale on the page. */
  updated: string;
  intro: LegalBlock[];
  sections: LegalSection[];
};
