import { cx } from "@/components/ui/cx";
import type { OrderStatus } from "@/lib/admin/types";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "New",
  processing: "Processing",
  completed: "Completed",
  canceled: "Canceled",
};

/** The order they are offered in: forward first, cancel last. */
export const STATUS_ORDER: OrderStatus[] = ["new", "processing", "completed", "canceled"];

const TONES: Record<OrderStatus, string> = {
  new: "bg-surface-brand text-brand-hover",
  processing: "bg-surface-sunken text-content-primary",
  completed: "bg-surface-raised text-success border border-success",
  canceled: "bg-surface-sunken text-content-secondary",
};

export function StatusPill({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cx(
        "text-micro shrink-0 rounded-pill px-3 py-1 uppercase whitespace-nowrap",
        TONES[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
