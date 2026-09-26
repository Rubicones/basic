"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import type { OrderStatus } from "@/lib/admin/types";

const STATUSES: OrderStatus[] = ["new", "processing", "completed", "canceled"];

export async function setOrderStatus(formData: FormData): Promise<void> {
  if (env.consoleDemo) return;

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as OrderStatus;
  if (!STATUSES.includes(status)) return;

  // The staff chat follows on its own: the update fires `orders_notify_status`,
  // which asks the notifier to edit this order's Telegram message.
  const supabase = await createClient();
  await supabase.from("orders").update({ status }).eq("id", id);

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
}
