import Link from "next/link";
import { Card, Grid } from "@/components/ui";
import { overviewCounts } from "@/lib/admin/queries";

export default async function ConsoleHome() {
  const counts = await overviewCounts();

  const cards = [
    { href: "/admin/products", label: "Products", value: counts.products },
    { href: "/admin/form", label: "Order form fields", value: counts.fields },
    { href: "/admin/orders", label: "New orders", value: counts.newOrders },
  ];

  return (
    <>
      <h1 className="text-display-md">Overview</h1>

      <div className="mt-8">
        <Grid cols={3} gap={5}>
          {cards.map((card) => (
            <Link key={card.href} href={card.href}>
              <Card interactive>
                <p className="text-micro text-content-secondary uppercase">{card.label}</p>
                <p className="font-display text-display-md mt-2 font-extrabold tabular-nums">
                  {card.value}
                </p>
              </Card>
            </Link>
          ))}
        </Grid>
      </div>
    </>
  );
}
