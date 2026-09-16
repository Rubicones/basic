import { notFound } from "next/navigation";
import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { getOrder } from "@/lib/admin/queries";
import { setOrderStatus } from "../actions";
import { STATUS_LABEL, StatusPill } from "../status";
import type { OrderStatus } from "@/lib/admin/types";

const NEXT: OrderStatus[] = ["new", "confirmed", "done", "cancelled"];

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  const answers = [...order.order_answers].sort((a, b) => a.position - b.position);

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/orders"
            className="text-caption text-content-secondary hover:text-brand"
          >
            ← All orders
          </Link>
          <h1 className="text-display-md mt-2">
            {new Date(order.created_at).toLocaleString("en-GB", {
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </h1>
        </div>
        <StatusPill status={order.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-order">
        <Card padding="lg">
          <h2 className="text-title mb-6 font-extrabold">What was ordered</h2>

          <ul className="divide-line divide-y">
            {order.order_items.map((item) => (
              <li key={item.id} className="flex items-baseline gap-4 py-3">
                <span className="text-body-sm min-w-0 flex-1">
                  {item.name_snapshot}
                  {item.variant === "whole" && " — whole cake"}
                </span>
                <span className="text-caption text-content-secondary shrink-0 tabular-nums">
                  {item.qty} × {item.unit_price_rsd.toLocaleString("en")}
                </span>
                <span className="font-display text-body-sm shrink-0 font-bold tabular-nums">
                  {(item.qty * item.unit_price_rsd).toLocaleString("en")}
                </span>
              </li>
            ))}
          </ul>

          <div className="border-line mt-4 flex items-baseline justify-between border-t pt-4">
            <span className="text-body-sm text-content-secondary">Total</span>
            <span className="font-display text-display-sm text-brand font-bold tabular-nums">
              {order.total_rsd.toLocaleString("en")} RSD
            </span>
          </div>

          <p className="text-caption text-content-secondary mt-4">
            Names and prices are as the customer saw them. Editing a product later does not change
            this order.
          </p>
        </Card>

        <div className="flex flex-col gap-6">
          <Card padding="lg">
            <h2 className="text-title mb-6 font-extrabold">Who ordered</h2>
            <dl className="flex flex-col gap-4">
              {answers.map((answer) => (
                <div key={answer.field_key}>
                  <dt className="text-micro text-content-secondary uppercase">
                    {answer.label_snapshot}
                  </dt>
                  <dd className="text-body-sm mt-1">{answer.value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card padding="lg">
            <h2 className="text-title mb-4 font-extrabold">Status</h2>
            <div className="flex flex-wrap gap-2">
              {NEXT.filter((status) => status !== order.status).map((status) => (
                <form key={status} action={setOrderStatus}>
                  <input type="hidden" name="id" value={order.id} />
                  <input type="hidden" name="status" value={status} />
                  <Button
                    type="submit"
                    size="sm"
                    variant={status === "cancelled" ? "danger" : "outline"}
                  >
                    {STATUS_LABEL[status]}
                  </Button>
                </form>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
