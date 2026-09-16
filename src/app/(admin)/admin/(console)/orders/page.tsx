import Link from "next/link";
import { Card } from "@/components/ui";
import { listOrders } from "@/lib/admin/queries";
import { STATUS_LABEL, StatusPill } from "./status";

export default async function OrdersPage() {
  const orders = await listOrders();

  return (
    <>
      <h1 className="text-display-md mb-8">Orders</h1>

      {orders.length === 0 ? (
        <Card>
          <p className="text-body-sm text-content-secondary">
            No orders yet. The order form does not submit anything until the pricing function is in
            place — see the note in docs/phase-4-notes.md.
          </p>
        </Card>
      ) : (
        <Card padding="none" clip>
          <ul className="divide-line divide-y">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="hover:bg-surface-brand/45 flex flex-wrap items-center gap-4 p-4 transition-surface"
                >
                  <span className="text-body-sm min-w-0 flex-1">
                    <span className="font-display block font-bold">
                      {new Date(order.created_at).toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="text-caption text-content-secondary block">
                      {order.locale.toUpperCase()} · {STATUS_LABEL[order.status]}
                    </span>
                  </span>

                  <span className="font-display text-body-sm shrink-0 font-bold tabular-nums">
                    {order.total_rsd.toLocaleString("en")} RSD
                  </span>

                  <StatusPill status={order.status} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
