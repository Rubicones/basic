import {
  buildMessage,
  buildPushMessage,
  type NotifyAnswer,
  type NotifyItem,
  type NotifyOrder,
  type OrderStatus,
} from "./message.ts";

/**
 * What happens to one order, independent of where it is running.
 *
 * Everything this needs arrives as a function: send, edit, claim, load, record,
 * push. That is not ceremony — it is the only way the interesting paths can be
 * exercised at all. A revoked token, a chat id pointing at a group the bot was
 * thrown out of, a flood wait, a group promoted to a supergroup mid-service, a
 * message someone deleted by hand before its status changed: none of those can
 * be produced on demand against the real API, and all of them are exactly the
 * cases where an order goes missing. Here they are fixtures — see
 * `scripts/check-notify-delivery.ts`.
 *
 * Three entry points:
 *   · deliver()     a new order: push to the administrators' devices once, then
 *                   announce it in the staff chat (retried until it lands)
 *   · syncStatus()  the console changed a status: edit that order's message
 *   · the test push lives in index.ts, because it is authorised differently
 */

export type TelegramResult = {
  ok: boolean;
  status: number;
  messageId?: number;
  description?: string;
  /** Seconds Telegram asks us to wait, from `parameters.retry_after`. */
  retryAfter?: number;
  /** The id a group was given when it became a supergroup. */
  migrateTo?: number;
};

export type PushOutcome = { sent: number; failed: number; removed: number };

export type Deps = {
  /** One atomic claim: null means someone else already has it, or it is sent. */
  claim: (id: string) => Promise<NotifyOrder | null>;
  /** The order as it stands, with no claim — for edits. */
  loadOrder: (id: string) => Promise<NotifyOrder | null>;
  load: (id: string) => Promise<{ items: NotifyItem[]; answers: NotifyAnswer[] }>;
  getSetting: <T>(key: string) => Promise<T | null>;
  setChatId: (chatId: number) => Promise<void>;
  send: (chatId: number | string, text: string) => Promise<TelegramResult>;
  edit: (chatId: number | string, messageId: number, text: string) => Promise<TelegramResult>;
  record: (
    id: string,
    messageId: number | null,
    error: string | null,
    shown?: { status: OrderStatus; chatId: number | string },
  ) => Promise<void>;
  /** Exactly once per order: true for the first caller, false for every other. */
  claimPush: (id: string) => Promise<boolean>;
  /** Send to every current administrator's devices. Never throws. */
  push: (message: ReturnType<typeof buildPushMessage>) => Promise<PushOutcome>;
  log: (event: string, fields?: Record<string, unknown>) => void;
  sleep: (ms: number) => Promise<void>;
};

export type Outcome = {
  status: number;
  body: Record<string, unknown>;
  headers?: Record<string, string>;
};

/** Long enough to be worth sitting out; past this it is the sweep's problem. */
const INLINE_WAIT_SECONDS = 5;

export async function deliver(id: string, deps: Deps): Promise<Outcome> {
  const order = await deps.claim(id);

  // The idempotency guard, doing its job. Webhooks fire more than once, and two
  // identical orders in a staff chat is worse than one arriving late. 200:
  // whoever called did nothing wrong and must not be told to try again.
  if (!order) {
    deps.log("already_sent", { order_id: id });
    return { status: 200, body: { skipped: "already_sent" } };
  }

  const [{ items, answers }, chatIdSetting, timeZone] = await Promise.all([
    deps.load(id),
    deps.getSetting<number | string>("telegram_chat_id"),
    deps.getSetting<string>("shop_timezone"),
  ]);

  // Push first, and independently: a phone should buzz even while Telegram is
  // misconfigured, and a Telegram retry must never buzz it again.
  await announceByPush(order, items, answers, deps);

  if (chatIdSetting === null || chatIdSetting === "") {
    deps.log("no_chat_id", { order_id: id });
    await deps.record(id, null, "settings.telegram_chat_id is not set");
    return { status: 500, body: { error: "no chat id" } };
  }

  const text = buildMessage(order, items, answers, {
    timeZone: timeZone ?? "Europe/Belgrade",
  });

  let chatId: number | string = chatIdSetting;
  let result = await deps.send(chatId, text);

  /*
   * A group that is upgraded to a supergroup gets a new id, and Telegram hands
   * it back exactly once — in the error body of the request that just failed.
   * Miss it and every order from then on fails with "chat not found" until
   * somebody notices the silence, so it is written down before anything else
   * and the send repeated. This is the only retry that happens inline.
   */
  if (!result.ok && result.migrateTo !== undefined) {
    const migrated = result.migrateTo;
    deps.log("chat_migrated", { order_id: id, from: String(chatId), to: String(migrated) });
    await deps.setChatId(migrated);
    chatId = migrated;
    result = await deps.send(chatId, text);
  }

  const waited = await sitOutFloodWait(result, id, deps, () => deps.send(chatId, text));
  if ("outcome" in waited) return waited.outcome;
  result = waited.result;

  if (!result.ok || result.messageId === undefined) {
    const description = result.description ?? `http ${result.status}`;
    deps.log("send_failed", {
      order_id: id,
      status: result.status,
      attempt: order.notify_attempts,
      description,
    });
    await deps.record(id, null, description);
    // Non-2xx deliberately: the row is what the sweep reads, but a failure
    // should also be a failure in the function's own logs and metrics.
    return { status: 502, body: { error: description } };
  }

  // The status the message was rendered with, not whatever the row says now —
  // if a colleague changed it in the meantime, the two differ and the sweep
  // sends the edit that closes the gap.
  await deps.record(id, result.messageId, null, { status: order.status, chatId });
  deps.log("sent", {
    order_id: id,
    order_number: order.number,
    message_id: result.messageId,
    attempt: order.notify_attempts,
    items: items.length,
    characters: text.length,
  });

  return { status: 200, body: { ok: true, message_id: result.messageId } };
}

/**
 * A status changed in the console: make the order's message say so.
 *
 * An edit, not a new message. The chat is a list of order cards; each one should
 * be true, and a stream of "order 42 is now completed" replies would bury the
 * next order under news about the last one.
 */
export async function syncStatus(id: string, deps: Deps): Promise<Outcome> {
  const order = await deps.loadOrder(id);

  if (!order) {
    deps.log("status_no_order", { order_id: id });
    return { status: 200, body: { skipped: "no_such_order" } };
  }

  // Not announced yet: the announcement will carry whatever the status is by
  // then, so there is nothing to edit.
  if (!order.telegram_message_id) {
    deps.log("status_not_announced", { order_id: id });
    return { status: 200, body: { skipped: "not_announced" } };
  }

  // A second webhook, or the sweep arriving after the trigger already won.
  if (order.telegram_status === order.status) {
    deps.log("status_in_sync", { order_id: id, status: order.status });
    return { status: 200, body: { skipped: "in_sync" } };
  }

  const messageId = order.telegram_message_id;
  const [{ items, answers }, chatIdSetting, timeZone] = await Promise.all([
    deps.load(id),
    deps.getSetting<number | string>("telegram_chat_id"),
    deps.getSetting<string>("shop_timezone"),
  ]);

  // The chat the message lives in — which is not necessarily the chat new
  // orders go to, if the group has been upgraded since.
  const chatId = order.telegram_chat_id ?? chatIdSetting;
  if (chatId === null || chatId === "") {
    deps.log("status_no_chat_id", { order_id: id });
    return { status: 500, body: { error: "no chat id" } };
  }

  const text = buildMessage(order, items, answers, { timeZone: timeZone ?? "Europe/Belgrade" });
  let result = await deps.edit(chatId, messageId, text);

  const waited = await sitOutFloodWait(result, id, deps, () => deps.edit(chatId, messageId, text));
  if ("outcome" in waited) return waited.outcome;
  result = waited.result;

  const description = (result.description ?? "").toLowerCase();

  // Already says this — Telegram refuses an edit that changes nothing, and that
  // refusal is a success as far as the chat is concerned.
  const unchanged = description.includes("message is not modified");

  // Somebody deleted the message by hand, or it can no longer be edited. There
  // is nothing a retry can fix, so it is recorded as settled rather than left
  // for the sweep to fail at every two minutes for a day.
  const impossible =
    description.includes("message to edit not found") ||
    description.includes("message can't be edited");

  if (result.ok || unchanged || impossible) {
    await deps.record(id, messageId, null, { status: order.status, chatId });
    deps.log(impossible ? "status_edit_impossible" : "status_synced", {
      order_id: id,
      status: order.status,
      ...(impossible ? { description } : {}),
    });
    return { status: 200, body: { ok: true, status: order.status } };
  }

  deps.log("status_edit_failed", { order_id: id, status: result.status, description });
  return { status: 502, body: { error: result.description ?? `http ${result.status}` } };
}

/**
 * A flood wait short enough to sit out is sat out, once; a long one is handed
 * back as a 429 with `Retry-After`, and the sweep comes back for it.
 */
async function sitOutFloodWait(
  result: TelegramResult,
  id: string,
  deps: Deps,
  again: () => Promise<TelegramResult>,
): Promise<{ result: TelegramResult } | { outcome: Outcome }> {
  if (result.ok || result.status !== 429 || result.retryAfter === undefined) return { result };

  if (result.retryAfter <= INLINE_WAIT_SECONDS) {
    deps.log("rate_limited_waiting", { order_id: id, retry_after: result.retryAfter });
    await deps.sleep(result.retryAfter * 1000);
    return { result: await again() };
  }

  deps.log("rate_limited", { order_id: id, retry_after: result.retryAfter });
  await deps.record(id, null, `429, retry after ${result.retryAfter}s`);
  return {
    outcome: {
      status: 429,
      body: { error: "rate limited", retry_after: result.retryAfter },
      headers: { "retry-after": String(result.retryAfter) },
    },
  };
}

/** Best effort, exactly once, and never the reason a Telegram delivery fails. */
async function announceByPush(
  order: NotifyOrder,
  items: NotifyItem[],
  answers: NotifyAnswer[],
  deps: Deps,
): Promise<void> {
  try {
    if (!(await deps.claimPush(order.id))) return;
    const outcome = await deps.push(buildPushMessage(order, items, answers));
    deps.log("push", { order_id: order.id, ...outcome });
  } catch (cause) {
    deps.log("push_failed", {
      order_id: order.id,
      message: cause instanceof Error ? cause.message : "unknown",
    });
  }
}
