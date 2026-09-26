// jsr: is what the current Edge Runtime documents. If a deploy ever refuses it,
// "https://esm.sh/@supabase/supabase-js@2" is the same library by the older route.
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import {
  deliver,
  syncStatus,
  type Deps,
  type PushOutcome,
  type TelegramResult,
} from "./deliver.ts";
import type { NotifyAnswer, NotifyItem, NotifyOrder, OrderStatus } from "./message.ts";
import { sendPush, type PushTarget, type VapidKeys } from "./push.ts";

/**
 * notify-order — an order arrived, or changed; tell the people running the shop.
 *
 * Three callers, two ways of proving who they are:
 *
 *   INSERT / SWEEP   the database, on a new order          x-notify-secret
 *   STATUS           the database, on a status change      x-notify-secret
 *   TEST_PUSH        an administrator's browser, from the  their own session,
 *                    console's Notifications page          checked against `admins`
 *
 * The bot token and the Web Push private key live here and nowhere else. This
 * file is the edges — environment, HTTP, authentication, clients; what happens
 * to an order is `deliver.ts`, which has no runtime of its own and is tested.
 *
 * Deliberately absent: `setWebhook`, callback queries, inline buttons. Status
 * changes arrive from the console, not from the chat.
 */

const TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const SECRET = Deno.env.get("NOTIFY_WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "";

/** One line, one JSON object, no free text — and nothing secret, ever. */
function log(event: string, fields: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ fn: "notify-order", event, ...fields }));
}

/**
 * The console calls the test push straight from the browser, which means a
 * preflight. Nothing here relies on cookies, so a wildcard origin gives nothing
 * away: the request still needs an administrator's own access token.
 */
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

/**
 * Constant-time comparison. This secret is compared against whatever anyone on
 * the internet sends; `===` returns fractionally sooner the earlier it finds a
 * difference, and that is measurable to a patient attacker.
 */
function secretMatches(given: string): boolean {
  if (SECRET.length === 0) return false;
  const encoder = new TextEncoder();
  const a = encoder.encode(given);
  const b = encoder.encode(SECRET);
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

async function telegram(method: string, payload: Record<string, unknown>): Promise<TelegramResult> {
  const response = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...payload,
      parse_mode: "HTML",
      // Nothing in the message is worth unfurling, and a preview card under
      // every order would push the next one off the screen.
      link_preview_options: { is_disabled: true },
    }),
  });

  const body = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    result?: { message_id?: number } | true;
    description?: string;
    parameters?: { retry_after?: number; migrate_to_chat_id?: number };
  };
  const result = typeof body.result === "object" ? body.result : undefined;

  return {
    ok: Boolean(body.ok),
    status: response.status,
    ...(result?.message_id !== undefined ? { messageId: result.message_id } : {}),
    ...(body.description !== undefined ? { description: body.description } : {}),
    ...(body.parameters?.retry_after !== undefined
      ? { retryAfter: body.parameters.retry_after }
      : {}),
    ...(body.parameters?.migrate_to_chat_id !== undefined
      ? { migrateTo: body.parameters.migrate_to_chat_id }
      : {}),
  };
}

/** Null when push is not set up — which is a supported state, not an error. */
async function vapidKeys(supabase: SupabaseClient): Promise<VapidKeys | null> {
  if (!VAPID_PRIVATE_KEY || !VAPID_SUBJECT) return null;
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "vapid_public_key")
    .maybeSingle();
  const publicKey = typeof data?.value === "string" ? data.value : "";
  return publicKey ? { publicKey, privateKey: VAPID_PRIVATE_KEY, subject: VAPID_SUBJECT } : null;
}

type SubscriptionRow = PushTarget & { failures: number };

/**
 * Send one message to a set of devices and keep the table honest about them:
 * a device that has gone away (404/410) is deleted, one that failed is counted,
 * one that worked is reset.
 */
async function pushTo(
  supabase: SupabaseClient,
  targets: SubscriptionRow[],
  message: unknown,
  keys: VapidKeys,
): Promise<PushOutcome & { results: { id: string; ok: boolean; error?: string }[] }> {
  const results = await Promise.all(
    targets.map(async (target) => ({ target, result: await sendPush(target, message, keys) })),
  );

  let sent = 0;
  let failed = 0;
  let removed = 0;

  await Promise.all(
    results.map(async ({ target, result }) => {
      if (result.ok) {
        sent += 1;
        await supabase
          .from("push_subscriptions")
          .update({ last_success_at: new Date().toISOString(), failures: 0, last_error: null })
          .eq("id", target.id);
      } else if (result.gone) {
        removed += 1;
        await supabase.from("push_subscriptions").delete().eq("id", target.id);
      } else {
        failed += 1;
        await supabase
          .from("push_subscriptions")
          .update({ failures: target.failures + 1, last_error: result.error ?? null })
          .eq("id", target.id);
      }
    }),
  );

  return {
    sent,
    failed,
    removed,
    results: results.map(({ target, result }) => ({
      id: target.id,
      ok: result.ok,
      ...(result.error ? { error: result.error } : {}),
    })),
  };
}

const SUBSCRIPTION_COLUMNS = "id, endpoint, p256dh, auth, failures";

function dependencies(supabase: SupabaseClient): Deps {
  return {
    log,
    sleep: (ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)),

    send: (chatId, text) => telegram("sendMessage", { chat_id: chatId, text }),
    edit: (chatId, messageId, text) =>
      telegram("editMessageText", { chat_id: chatId, message_id: messageId, text }),

    claim: async (id) => {
      const { data, error } = await supabase.rpc("claim_order_notification", { p_id: id });
      if (error) throw new Error(`claim failed: ${error.message}`);
      const order = data as NotifyOrder | null;
      return order && order.id ? order : null;
    },

    loadOrder: async (id) => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, number, created_at, locale, total_rsd, status, notify_attempts," +
            " telegram_message_id, telegram_chat_id, telegram_status",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(`load failed: ${error.message}`);
      return (data as NotifyOrder | null) ?? null;
    },

    load: async (id) => {
      const [{ data: items }, { data: answers }] = await Promise.all([
        supabase
          .from("order_items")
          .select("name_snapshot, variant, qty, unit_price_rsd")
          .eq("order_id", id),
        supabase
          .from("order_answers")
          .select("field_key, label_snapshot, value, position")
          .eq("order_id", id)
          .order("position"),
      ]);
      return {
        items: (items ?? []) as NotifyItem[],
        answers: (answers ?? []) as NotifyAnswer[],
      };
    },

    getSetting: async <T>(key: string): Promise<T | null> => {
      const { data } = await supabase.from("settings").select("value").eq("key", key).maybeSingle();
      return (data?.value ?? null) as T | null;
    },

    setChatId: async (chatId) => {
      const { error } = await supabase
        .from("settings")
        .update({ value: chatId })
        .eq("key", "telegram_chat_id");
      if (error) log("chat_migration_not_saved", { message: error.message });
    },

    record: async (id, messageId, message, shown) => {
      const { error } = await supabase.rpc("record_order_notification", {
        p_id: id,
        p_message_id: messageId,
        p_error: message,
        p_status: (shown?.status ?? null) as OrderStatus | null,
        p_chat_id: shown?.chatId === undefined ? null : Number(shown.chatId),
      });
      if (error) log("record_failed", { order_id: id, message: error.message });
    },

    claimPush: async (id) => {
      const { data, error } = await supabase.rpc("claim_order_push", { p_id: id });
      if (error) {
        log("push_claim_failed", { order_id: id, message: error.message });
        return false;
      }
      return data === true;
    },

    push: async (message) => {
      const keys = await vapidKeys(supabase);
      if (!keys) return { sent: 0, failed: 0, removed: 0 };

      // Current administrators only: revoking someone's console access has to
      // stop their phone too, without anyone remembering to unsubscribe it.
      const { data: admins } = await supabase.from("admins").select("user_id");
      const ids = (admins ?? []).map((row: { user_id: string }) => row.user_id);
      if (ids.length === 0) return { sent: 0, failed: 0, removed: 0 };

      const { data: targets } = await supabase
        .from("push_subscriptions")
        .select(SUBSCRIPTION_COLUMNS)
        .in("user_id", ids);

      const { sent, failed, removed } = await pushTo(
        supabase,
        (targets ?? []) as SubscriptionRow[],
        message,
        keys,
      );
      return { sent, failed, removed };
    },
  };
}

/**
 * "Send a test" from the Notifications page.
 *
 * Authorised by the administrator's own session rather than the shared secret —
 * the browser must never hold that — and sent only to their own devices.
 */
async function testPush(request: Request, supabase: SupabaseClient): Promise<Response> {
  const authorization = request.headers.get("authorization") ?? "";
  if (!ANON_KEY || !authorization.startsWith("Bearer ")) {
    return json({ error: "sign in first" }, 401, CORS);
  }

  const asUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
  } = await asUser.auth.getUser(authorization.slice("Bearer ".length));
  const { data: allowed } = await asUser.rpc("is_admin");

  if (!user || !allowed) {
    log("test_push_refused", { user: user?.id ?? null });
    return json({ error: "administrators only" }, 403, CORS);
  }

  const keys = await vapidKeys(supabase);
  if (!keys) {
    log("test_push_not_configured", { user: user.id });
    return json({ error: "push is not configured on the server" }, 503, CORS);
  }

  const { data: targets } = await supabase
    .from("push_subscriptions")
    .select(SUBSCRIPTION_COLUMNS)
    .eq("user_id", user.id);

  const outcome = await pushTo(
    supabase,
    (targets ?? []) as SubscriptionRow[],
    {
      title: "basic — test",
      body: "Push notifications reach this device.",
      url: "/admin/notifications",
      tag: "test",
    },
    keys,
  );

  log("test_push", {
    user: user.id,
    sent: outcome.sent,
    failed: outcome.failed,
    removed: outcome.removed,
  });
  return json(outcome, 200, CORS);
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (request.method !== "POST") return new Response("method not allowed", { status: 405 });

  if (!SUPABASE_URL || !SERVICE_KEY) {
    log("misconfigured", { url: Boolean(SUPABASE_URL), service_key: Boolean(SERVICE_KEY) });
    return new Response("not configured", { status: 500 });
  }

  // Service role: the only thing in this system that reads orders without being
  // a signed-in administrator. RLS is what makes that a deliberate act rather
  // than an oversight, so it lives here and not in the site.
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const payload = (await request.json().catch(() => ({}))) as {
    type?: string;
    record?: { id?: string };
    id?: string;
  };

  if (payload.type === "TEST_PUSH") return testPush(request, supabase);

  if (!secretMatches(request.headers.get("x-notify-secret") ?? "")) {
    log("unauthorised", { from: request.headers.get("x-forwarded-for") ?? "unknown" });
    return new Response("unauthorised", { status: 401 });
  }

  if (!TOKEN) {
    log("misconfigured", { token: false });
    return new Response("not configured", { status: 500 });
  }

  const id = payload.record?.id ?? payload.id;
  if (typeof id !== "string" || id.length === 0) {
    log("no_order_id", { type: payload.type ?? "unknown" });
    return new Response("no order id", { status: 400 });
  }

  try {
    const deps = dependencies(supabase);
    const outcome =
      payload.type === "STATUS" ? await syncStatus(id, deps) : await deliver(id, deps);
    return json(outcome.body, outcome.status, outcome.headers ?? {});
  } catch (cause) {
    // A thrown error means a database call failed, not Telegram — the attempt
    // is already counted, so the sweep will come back for it.
    log("failed", { order_id: id, message: cause instanceof Error ? cause.message : "unknown" });
    return json({ error: "internal" }, 500);
  }
});
