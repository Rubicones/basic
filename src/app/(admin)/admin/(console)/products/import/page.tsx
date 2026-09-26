import Link from "next/link";
import { Card } from "@/components/ui";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { ImportForm } from "./import-form";

/** What each column is for, in the order the template has them. */
const COLUMNS: [string, string, string][] = [
  ["slug", "no", "The address of the product. Left empty, it is made from the name."],
  ["position", "no", "Lower comes first in the catalog. Left empty, the row order is used."],
  [
    "price_rsd",
    "yes",
    "Per piece, whole dinars. “1 250”, “1.250” and “1250 RSD” all read as 1250.",
  ],
  ["whole_price_rsd", "no", "Filled in, the card offers the piece / whole-cake toggle."],
  ["tag", "no", "The word in the corner of the card — “Hit”, “Novo”."],
  [
    "formats",
    "yes",
    "chilled, frozen, ambient — comma separated. Serbian and Russian words are understood.",
  ],
  ["weight_g", "no", "One piece, or the whole cake on a whole-cake product."],
  ["kcal · protein_g · fat_g · carbs_g", "no", "Per 100 g. All four or none."],
  ["photo", "no", "A file already in the bucket, or /products/<name>.jpg from the repository."],
  ["published", "no", "yes / no. Empty means yes."],
  [
    `name_${DEFAULT_LOCALE} · note_${DEFAULT_LOCALE}`,
    "yes",
    "The fallback every other language falls back to.",
  ],
  [
    "name_ru · note_ru · name_en · note_en",
    "no",
    "Left empty, the language falls back to the default one.",
  ],
];

export default function ImportPage() {
  return (
    <>
      <h1 className="text-display-md">Import a price list</h1>
      <p className="text-body-sm text-content-secondary mt-2 mb-8 max-w-measure">
        One row per product, from an .xlsx or a CSV. Rows are matched by slug, so importing a
        corrected file updates what is already here instead of doubling it. Nothing is written
        unless every row reads cleanly.
      </p>

      <div className="flex flex-col gap-6">
        <ImportForm />

        <Card padding="lg">
          <h2 className="text-title mb-6 font-extrabold">The columns</h2>
          <dl className="divide-line divide-y">
            {COLUMNS.map(([name, required, note]) => (
              <div key={name} className="grid gap-1 py-3 sm:grid-cols-3 sm:gap-4">
                <dt className="text-body-sm font-bold">
                  {name}
                  {required === "yes" && <span className="text-danger ml-1">*</span>}
                </dt>
                <dd className="text-body-sm text-content-secondary sm:col-span-2">{note}</dd>
              </div>
            ))}
          </dl>
          <p className="text-caption text-content-tertiary mt-5">
            Headings are matched however they are typed — case, spacing and punctuation are ignored,
            and the Serbian and Russian names for these columns are understood too. Any column the
            file has that is not on this list is ignored rather than refused.
          </p>
        </Card>

        <p className="text-body-sm text-content-secondary">
          <Link href="/admin/products" className="hover:text-brand underline">
            Back to products
          </Link>
        </p>
      </div>
    </>
  );
}
