import { cx } from "@/components/ui/cx";
import type { OrderStatus } from "@/lib/admin/types";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "New",
  confirmed: "Confirmed",
  done: "Delivered",
  cancelled: "Cancelled",
};

const TONES: Record<OrderStatus, string> = {
  new: "bg-surface-brand text-brand-hover",
  confirmed: "bg-surface-sunken text-content-primary",
  done: "bg-surface-raised text-success border border-success",
  cancelled: "bg-surface-sunken text-content-secondary",
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
