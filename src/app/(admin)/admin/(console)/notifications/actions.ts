"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export type SaveDeviceInput = { endpoint: string; p256dh: string; auth: string; label: string };
export type DeviceResult = { ok: true } | { ok: false; error: string };

const PUSH_ENDPOINT = /^https:\/\/[^\s/]+\/\S+$/;

/**
 * Remember this browser's subscription for the signed-in administrator.
 *
 * Written with their own session, so RLS decides — the row can only ever be
 * theirs. Upserted on the endpoint, because a browser that subscribes again
 * hands back the same endpoint with fresh keys.
 */
export async function saveDevice(input: SaveDeviceInput): Promise<DeviceResult> {
  if (env.consoleDemo) return { ok: false, error: "Demo mode: nothing was saved." };

  const endpoint = String(input.endpoint ?? "");
  if (!PUSH_ENDPOINT.test(endpoint) || !input.p256dh || !input.auth) {
    return { ok: false, error: "The browser handed back a subscription that cannot be used." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in again, then turn notifications on." };

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh: String(input.p256dh),
      auth: String(input.auth),
      label: String(input.label ?? "").slice(0, 80),
      failures: 0,
      last_error: null,
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    // The same browser profile, already subscribed under a colleague's account:
    // their row, which this session may not touch.
    return {
      ok: false,
      error: /row-level security/i.test(error.message)
        ? "This browser is already receiving notifications for another administrator. Turn them off there first."
        : error.message,
    };
  }

  revalidatePath("/admin/notifications");
  return { ok: true };
}

/** Forget one device. RLS makes "one of mine" the only kind that can be removed. */
export async function removeDevice(id: string): Promise<DeviceResult> {
  if (env.consoleDemo) return { ok: false, error: "Demo mode: nothing was saved." };

  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("id", String(id));
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/notifications");
  return { ok: true };
}
