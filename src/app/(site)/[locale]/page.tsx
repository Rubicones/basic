import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Header } from "@/components/site/header";
import { Hero } from "@/components/site/hero";
import { Catalog } from "@/components/site/catalog";
import { Delivery } from "@/components/site/delivery";
import { Order, OrderBar } from "@/components/site/order";
import { Footer } from "@/components/site/footer";
import { CartProvider } from "@/lib/cart/context";
import { getCatalog } from "@/lib/catalog/source";
import { getOrderFields } from "@/lib/order/public-fields";
import { homeJsonLd, serializeJsonLd } from "@/lib/seo";

/**
 * The landing page, built section by section.
 *
 * Sections land here in the order the audit established: header and hero first,
 * then catalog, delivery, order form and footer.
 *
 * The two reads are this page's entire connection to the database, and they are
 * deliberately both here: everything below takes its data as a prop, so no
 * section has to become a server component to find out where the data came from,
 * and the fixture still renders the whole page with no database at all.
 */

/**
 * Rebuilt at most once a minute, and immediately when the console saves —
 * `revalidatePath` in the console's actions is what makes a price edit appear
 * without waiting the window out.
 */
export const revalidate = 60;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);

  const [products, fields] = await Promise.all([getCatalog(), getOrderFields(locale, t)]);

  return (
    <>
      {/* Structured data: the business, the site, and the catalogue as offers —
          read from the same products the cards render, so it cannot drift. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(homeJsonLd(locale, t, products)) }}
      />
      <CartProvider products={products}>
        <Header locale={locale} t={t} />
        <main id="main">
          <Hero locale={locale} t={t} />
          <Catalog locale={locale} t={t} products={products} />
          <Delivery t={t} />
          <Order locale={locale} t={t} fields={fields} />
          {/* Last in the page, as the reference has it: the bar is fixed, so it
              belongs to the whole page rather than to the order section. */}
          <OrderBar locale={locale} t={t} />
        </main>
        <Footer locale={locale} t={t} />
      </CartProvider>
    </>
  );
}
