import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Header } from "@/components/site/header";
import { Hero } from "@/components/site/hero";
import { Catalog } from "@/components/site/catalog";
import { Delivery } from "@/components/site/delivery";
import { Order, OrderBar } from "@/components/site/order";
import { CartProvider } from "@/lib/cart/context";

/**
 * The landing page, built section by section.
 *
 * Sections land here in the order the audit established: header and hero first,
 * then catalog, delivery, order form and footer.
 */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);

  return (
    <>
      <CartProvider>
        <Header locale={locale} t={t} />
        <main id="main">
          <Hero locale={locale} t={t} />
          <Catalog locale={locale} t={t} />
          <Delivery t={t} />
          <Order locale={locale} t={t} />
          {/* Last in the page, as the reference has it: the bar is fixed, so it
              belongs to the whole page rather than to the order section. */}
          <OrderBar locale={locale} t={t} />
        </main>
      </CartProvider>
    </>
  );
}
