"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  Button,
  Card,
  Checkbox,
  IconAlert,
  IconArrowRight,
  IconCheck,
  Input,
  Textarea,
} from "@/components/ui";
import { LOCALES, LOCALE_LABEL, DEFAULT_LOCALE } from "@/lib/i18n/config";
import { FORMATS } from "@/lib/catalog/products";
import { saveProduct, type SaveState } from "./actions";
import { PhotoField } from "./photo-field";
import type { ProductWithTranslations } from "@/lib/admin/types";

/** One form for both new and existing. The difference is what it is seeded with. */
export function ProductEditor({ product }: { product: ProductWithTranslations | null }) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveProduct, {});

  const textFor = (locale: string) =>
    product?.product_translations.find((row) => row.locale === locale);

  return (
    <form action={action} className="flex flex-col gap-6">
      {product && <input type="hidden" name="original_slug" value={product.slug} />}

      {state.error && (
        <p role="alert" className="text-body-sm text-danger flex items-start gap-2 font-medium">
          <span className="mt-0.5 shrink-0">
            <IconAlert size={16} />
          </span>
          {state.error}
        </p>
      )}

      <Card padding="lg">
        <h2 className="text-title mb-6 font-extrabold">The product</h2>

        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <Input
            name="slug"
            label="Slug"
            defaultValue={product?.slug ?? ""}
            required
            help="Lowercase, hyphenated. It is part of the URL, so changing it changes links."
          />
          <Input
            name="position"
            type="number"
            label="Position"
            defaultValue={String(product?.position ?? 0)}
            help="Lower comes first in the catalog."
          />
          <Input
            name="price_rsd"
            type="number"
            min={0}
            step={10}
            label="Price, RSD"
            defaultValue={String(product?.price_rsd ?? 0)}
            required
            help="Per piece. Whole dinars."
          />
          <Input
            name="whole_multiplier"
            type="number"
            min={1}
            label="Whole-cake multiplier"
            defaultValue={String(product?.whole_multiplier ?? 6)}
            help="What the piece price is multiplied by for a whole cake."
          />
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <Checkbox
            name="has_whole"
            label="Offer the piece / whole-cake toggle"
            defaultChecked={product?.has_whole ?? false}
          />
          <Checkbox
            name="price_is_placeholder"
            label="The price is a stand-in"
            help="Shown as provisional until a real one is set."
            defaultChecked={product?.price_is_placeholder ?? false}
          />
          <Checkbox
            name="is_published"
            label="Live on the site"
            help={`Needs a ${DEFAULT_LOCALE.toUpperCase()} name — that is the fallback for every language.`}
            defaultChecked={product?.is_published ?? false}
          />
        </div>

        <fieldset className="mt-6 border-0 p-0">
          <legend className="text-micro text-brand mb-3 uppercase">How it keeps</legend>
          <div className="flex flex-col gap-3">
            {FORMATS.map((format) => (
              <Checkbox
                key={format}
                name="formats"
                value={format}
                label={format}
                defaultChecked={product?.formats.includes(format) ?? false}
              />
            ))}
          </div>
        </fieldset>
      </Card>

      <Card padding="lg">
        <h2 className="text-title mb-6 font-extrabold">Photograph</h2>
        <PhotoField
          initialPath={product?.photo_path ?? null}
          initialBlur={product?.photo_blur ?? null}
        />
        <div className="mt-4">
          <Checkbox
            name="photo_is_placeholder"
            label="This photo is borrowed from another product"
            defaultChecked={product?.photo_is_placeholder ?? false}
          />
        </div>
      </Card>

      {LOCALES.map((locale) => (
        <Card key={locale} padding="lg">
          <h2 className="text-title mb-6 font-extrabold">
            {LOCALE_LABEL[locale]}
            {locale === DEFAULT_LOCALE && (
              <span className="text-caption text-content-secondary ml-3 font-normal">
                required — every other language falls back to it
              </span>
            )}
          </h2>

          <div className="flex flex-col gap-5">
            <Input
              name={`name_${locale}`}
              label="Name"
              defaultValue={textFor(locale)?.name ?? ""}
              required={locale === DEFAULT_LOCALE}
            />
            <Textarea
              name={`note_${locale}`}
              label="Note"
              rows={2}
              defaultValue={textFor(locale)?.note ?? ""}
              help="The line under the name on the card."
            />
          </div>
        </Card>
      ))}

      <div className="flex items-center gap-4">
        <Button
          type="submit"
          size="lg"
          loading={pending}
          loadingLabel="Saving…"
          iconEnd={<IconArrowRight size={20} />}
        >
          Save
        </Button>
        <Link
          href="/admin/products"
          className="text-body-sm text-content-secondary hover:text-brand"
        >
          Cancel
        </Link>
        {state.note && (
          <p role="status" className="text-body-sm text-content-secondary flex items-center gap-2">
            <IconCheck size={16} />
            {state.note}
          </p>
        )}
      </div>
    </form>
  );
}
