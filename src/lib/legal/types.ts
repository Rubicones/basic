/**
 * A legal document, as data.
 *
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
  /** Overrides the privacy-specific company label for other documents. */
  companyLabel?: string;
  /** Document-specific company information, such as banking and VAT status. */
  companyDetails?: { label: string; value: string }[];
  intro: LegalBlock[];
  sections: LegalSection[];
};
