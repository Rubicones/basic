import Link from "next/link";
import { Button, Card, IconPlus } from "@/components/ui";
import { listProducts, photoUrl } from "@/lib/admin/queries";
import { forLocale } from "@/lib/admin/types";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";

export default async function ProductsPage() {
  const products = await listProducts();

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-display-md">Products</h1>
        <Link href="/admin/products/new">
          <Button iconStart={<IconPlus size={16} />}>New product</Button>
        </Link>
      </div>

      {products.length === 0 ? (
        <Card>
          <p className="text-body-sm text-content-secondary">
            Nothing here yet. Run <code>npm run seed</code> against the database, or add the first
            product by hand.
          </p>
        </Card>
      ) : (
        <Card padding="none" clip>
          <ul className="divide-line divide-y">
            {products.map((product) => {
              const text = forLocale(product.product_translations, DEFAULT_LOCALE, DEFAULT_LOCALE);
              const photo = photoUrl(product.photo_path);

              return (
                <li key={product.id}>
                  <Link
                    href={`/admin/products/${product.slug}`}
                    className="hover:bg-surface-brand/45 flex items-center gap-4 p-4 transition-surface"
                  >
                    <span className="border-line bg-surface-sunken size-12 shrink-0 overflow-hidden rounded-inner border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {photo && <img src={photo} alt="" className="size-full object-cover" />}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="font-display text-body-sm block font-bold">
                        {text?.name ?? product.slug}
                      </span>
                      <span className="text-caption text-content-secondary block truncate">
                        {product.slug} · {product.formats.join(", ") || "no formats"}
                      </span>
                    </span>

                    <span className="font-display text-body-sm shrink-0 font-bold tabular-nums">
                      {product.price_rsd.toLocaleString("en")} RSD
                    </span>

                    <span
                      className={
                        product.is_published
                          ? "bg-surface-brand text-brand-hover text-micro shrink-0 rounded-pill px-3 py-1 uppercase"
                          : "bg-surface-sunken text-content-secondary text-micro shrink-0 rounded-pill px-3 py-1 uppercase"
                      }
                    >
                      {product.is_published ? "Live" : "Draft"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
