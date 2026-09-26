/**
 * The four ways a notification goes wrong, and the one way it goes right.
 *
 *   node --experimental-strip-types scripts/check-notify-delivery.ts
 *
 * These are the cases that cannot be produced on demand against the real API —
 * you cannot ask Telegram to revoke your token at 14:00 on a Tuesday, or to
 * promote a group to a supergroup while an order is in flight — and they are
 * exactly the cases where an order goes missing. So Telegram is a fixture here:
 * the responses are the ones the Bot API documents, byte for byte in the shape
 * the code reads.
 *
 * What this does NOT prove is that the real API answers this way, or that the
 * Deno wiring in `index.ts` is correct. `docs/telegram-setup.md` has the manual
 * pass against a real group, which is what covers that.
 */

import {
  deliver,
  syncStatus,
  type Deps,
  type TelegramResult,
} from "../supabase/functions/notify-order/deliver.ts";
import type { NotifyOrder } from "../supabase/functions/notify-order/message.ts";

let failures = 0;

function check(name: string, condition: boolean, detail = ""): void {
  if (condition) console.log(`  ok   ${name}`);
  else {
    failures += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const ORDER: NotifyOrder = {
  id: "8f1c2f4e-0000-4000-8000-000000000001",
  number: 7,
  created_at: "2026-09-24T08:05:00.000Z",
  locale: "sr",
  total_rsd: 3_420,
  status: "new",
  notify_attempts: 1,
};

type Recorded = {
  messageId: number | null;
  error: string | null;
  shown?: { status: string; chatId: number | string } | undefined;
};

/** A stand-in for everything outside `deliver`, with the tape it wrote. */
function harness(
  responses: TelegramResult[],
  options: {
    order?: NotifyOrder | null;
    chatId?: number | string | null;
    pushClaimed?: boolean;
    pushThrows?: boolean;
  } = {},
) {
  const sent: { chatId: number | string; text: string }[] = [];
  const edited: { chatId: number | string; messageId: number; text: string }[] = [];
  const pushed: { title: string; body: string; url: string }[] = [];
  const recorded: Recorded[] = [];
  const events: string[] = [];
  const slept: number[] = [];
  let pushClaims = 0;
  let chatId: number | string | null =
    options.chatId === undefined ? -1001111111111 : options.chatId;
  const reply = (count: number) => responses[Math.min(count - 1, responses.length - 1)]!;

  const deps: Deps = {
    claim: async () => (options.order === undefined ? ORDER : options.order),
    loadOrder: async () => (options.order === undefined ? ORDER : options.order),
    load: async () => ({
      items: [{ name_snapshot: "Medovik", variant: "piece", qty: 2, unit_price_rsd: 450 }],
      answers: [
        { field_key: "venue", label_snapshot: "Objekat", value: "Kafić", position: 0 },
        { field_key: "phone", label_snapshot: "Telefon", value: "+381641234567", position: 1 },
      ],
    }),
    getSetting: async <T>(key: string) =>
      (key === "telegram_chat_id" ? chatId : "Europe/Belgrade") as T | null,
    setChatId: async (next: number) => {
      chatId = next;
    },
    send: async (to, text) => {
      sent.push({ chatId: to, text });
      return reply(sent.length);
    },
    edit: async (to, messageId, text) => {
      edited.push({ chatId: to, messageId, text });
      return reply(edited.length);
    },
    record: async (_id, messageId, error, shown) => {
      recorded.push({ messageId, error, shown });
    },
    claimPush: async () => {
      pushClaims += 1;
      // The database's answer: true for the first claim of an order, false after.
      return (options.pushClaimed ?? false) ? false : pushClaims === 1;
    },
    push: async (message) => {
      if (options.pushThrows) throw new Error("push service unreachable");
      pushed.push(message);
      return { sent: 1, failed: 0, removed: 0 };
    },
    log: (event) => {
      events.push(event);
    },
    sleep: async (ms) => {
      slept.push(ms);
    },
  };

  return { deps, sent, edited, pushed, recorded, events, slept, chatIdNow: () => chatId };
}

const OK: TelegramResult = { ok: true, status: 200, messageId: 5150 };

console.log("the happy path");
{
  const h = harness([OK]);
  const outcome = await deliver(ORDER.id, h.deps);

  check("200", outcome.status === 200, String(outcome.status));
  check("sent once", h.sent.length === 1);
  check("to the configured group", h.sent[0]?.chatId === -1001111111111);
  check("the message id is stored", h.recorded[0]?.messageId === 5150);
  check("no error is stored", h.recorded[0]?.error === null);
  check("logged as sent", h.events.includes("sent"), h.events.join(","));
}

console.log("\na second webhook for the same order");
{
  // The claim comes back empty, which is what the database does once
  // `telegram_message_id` is set.
  const h = harness([OK], { order: null });
  const outcome = await deliver(ORDER.id, h.deps);

  check("nothing is sent", h.sent.length === 0);
  check("200, not an error", outcome.status === 200);
  check("says why", outcome.body.skipped === "already_sent");
  check("nothing is recorded", h.recorded.length === 0);
}

console.log("\na revoked token");
{
  // What the Bot API returns once a token is revoked in BotFather.
  const h = harness([{ ok: false, status: 401, description: "Unauthorized" }]);
  const outcome = await deliver(ORDER.id, h.deps);

  check("502 back to the caller", outcome.status === 502, String(outcome.status));
  check("the reason is stored on the order", h.recorded[0]?.error === "Unauthorized");
  check("nothing is marked as sent", h.recorded[0]?.messageId === null);
  check("tried exactly once", h.sent.length === 1);
  check("logged as a failure", h.events.includes("send_failed"));
}

console.log("\na wrong chat id");
{
  const h = harness([{ ok: false, status: 400, description: "Bad Request: chat not found" }]);
  const outcome = await deliver(ORDER.id, h.deps);

  check("502", outcome.status === 502);
  check("the description is kept verbatim", h.recorded[0]?.error === "Bad Request: chat not found");
  check("no retry against the same wrong id", h.sent.length === 1);
}

console.log("\nno chat id configured at all");
{
  const h = harness([OK], { chatId: null });
  const outcome = await deliver(ORDER.id, h.deps);

  check("nothing is sent", h.sent.length === 0);
  check("500", outcome.status === 500);
  check("the order says what is missing", /telegram_chat_id/.test(h.recorded[0]?.error ?? ""));
}

console.log("\nthe group becomes a supergroup");
{
  const h = harness([
    {
      ok: false,
      status: 400,
      description: "Bad Request: group chat was upgraded to a supergroup chat",
      migrateTo: -1002222222222,
    },
    OK,
  ]);
  const outcome = await deliver(ORDER.id, h.deps);

  check("the new id is saved", h.chatIdNow() === -1002222222222);
  check("retried immediately", h.sent.length === 2);
  check("the retry went to the new id", h.sent[1]?.chatId === -1002222222222);
  check("the order is delivered", outcome.status === 200 && h.recorded[0]?.messageId === 5150);
  check("logged as a migration", h.events.includes("chat_migrated"));
}

console.log("\na short flood wait");
{
  const h = harness([
    { ok: false, status: 429, description: "Too Many Requests", retryAfter: 3 },
    OK,
  ]);
  const outcome = await deliver(ORDER.id, h.deps);

  check("waited what Telegram asked", h.slept[0] === 3000, String(h.slept[0]));
  check("then sent", h.sent.length === 2 && outcome.status === 200);
  check("no error left on the order", h.recorded[0]?.error === null);
}

console.log("\na long flood wait");
{
  const h = harness([{ ok: false, status: 429, description: "Too Many Requests", retryAfter: 47 }]);
  const outcome = await deliver(ORDER.id, h.deps);

  check("does not sit on it", h.slept.length === 0);
  check(
    "429 with Retry-After",
    outcome.status === 429 && outcome.headers?.["retry-after"] === "47",
  );
  check("only one attempt", h.sent.length === 1);
  check("the wait is written down", /retry after 47s/.test(h.recorded[0]?.error ?? ""));
  check("and the sweep will find it", h.recorded[0]?.messageId === null);
}

console.log("\npush, alongside the first delivery");
{
  const h = harness([OK]);
  await deliver(ORDER.id, h.deps);

  check("one push", h.pushed.length === 1, String(h.pushed.length));
  check("titled with the order number", h.pushed[0]?.title === "Nova porudžbina #7");
  check("says who ordered", h.pushed[0]?.body.startsWith("Kafić") ?? false, h.pushed[0]?.body);
  check("opens the order", h.pushed[0]?.url === `/admin/orders/${ORDER.id}`);
}

console.log("\npush, when the push was already sent by an earlier attempt");
{
  // The sweep retrying a Telegram failure must not buzz everyone's phone again.
  const h = harness([OK], { pushClaimed: true });
  await deliver(ORDER.id, h.deps);

  check("no second push", h.pushed.length === 0);
  check("Telegram still delivered", h.recorded[0]?.messageId === 5150);
}

console.log("\npush, with Telegram not configured at all");
{
  const h = harness([OK], { chatId: null });
  await deliver(ORDER.id, h.deps);

  check("the phone still buzzes", h.pushed.length === 1);
  check(
    "and the missing chat id is still reported",
    /telegram_chat_id/.test(h.recorded[0]?.error ?? ""),
  );
}

console.log("\npush, with the push service down");
{
  const h = harness([OK], { pushThrows: true });
  const outcome = await deliver(ORDER.id, h.deps);

  check("Telegram is unaffected", outcome.status === 200 && h.sent.length === 1);
  check("the failure is logged", h.events.includes("push_failed"), h.events.join(","));
}

console.log("\nthe message records the status it showed");
{
  const h = harness([OK]);
  await deliver(ORDER.id, h.deps);

  check(
    "status and chat stored with the message id",
    h.recorded[0]?.shown?.status === "new" && h.recorded[0]?.shown?.chatId === -1001111111111,
    JSON.stringify(h.recorded[0]),
  );
  check(
    "the headline carries the status",
    /Porudžbina #7<\/b> · 🆕 <b>Nova<\/b>/.test(h.sent[0]?.text ?? ""),
    h.sent[0]?.text.split("\n")[0],
  );
}

const ANNOUNCED: NotifyOrder = {
  ...ORDER,
  status: "completed",
  telegram_message_id: 5150,
  telegram_chat_id: -1001111111111,
  telegram_status: "new",
};

console.log("\nstatus change: the message is edited");
{
  const h = harness([{ ok: true, status: 200 }], { order: ANNOUNCED });
  const outcome = await syncStatus(ORDER.id, h.deps);

  check("200", outcome.status === 200, JSON.stringify(outcome.body));
  check("an edit, not a new message", h.edited.length === 1 && h.sent.length === 0);
  check("of the right message", h.edited[0]?.messageId === 5150);
  check("now says completed", /Završena/.test(h.edited[0]?.text ?? ""));
  check("recorded as in sync", h.recorded[0]?.shown?.status === "completed");
}

console.log("\nstatus change: the message lives in a chat that has since moved");
{
  // New orders now go to the supergroup; this message is still in the old group.
  const h = harness([{ ok: true, status: 200 }], {
    order: { ...ANNOUNCED, telegram_chat_id: -4000000001 },
    chatId: -1002222222222,
  });
  await syncStatus(ORDER.id, h.deps);

  check("edited where the message is", h.edited[0]?.chatId === -4000000001);
}

console.log("\nstatus change: nothing to do");
{
  const inSync = harness([OK], { order: { ...ANNOUNCED, telegram_status: "completed" } });
  const a = await syncStatus(ORDER.id, inSync.deps);
  check("already in sync → no call", inSync.edited.length === 0 && a.body.skipped === "in_sync");

  const notYet = harness([OK], { order: { ...ANNOUNCED, telegram_message_id: null } });
  const b = await syncStatus(ORDER.id, notYet.deps);
  check(
    "not announced yet → no call",
    notYet.edited.length === 0 && b.body.skipped === "not_announced",
  );
}

console.log("\nstatus change: Telegram says nothing changed");
{
  const h = harness(
    [
      {
        ok: false,
        status: 400,
        description:
          "Bad Request: message is not modified: specified new message content and reply markup are exactly the same",
      },
    ],
    { order: ANNOUNCED },
  );
  const outcome = await syncStatus(ORDER.id, h.deps);

  check(
    "treated as success",
    outcome.status === 200 && h.recorded[0]?.shown?.status === "completed",
  );
}

console.log("\nstatus change: somebody deleted the message");
{
  const h = harness(
    [{ ok: false, status: 400, description: "Bad Request: message to edit not found" }],
    {
      order: ANNOUNCED,
    },
  );
  const outcome = await syncStatus(ORDER.id, h.deps);

  check(
    "settled, so the sweep stops trying",
    outcome.status === 200 && h.recorded[0]?.shown?.status === "completed",
  );
  check("and logged", h.events.includes("status_edit_impossible"));
}

console.log("\nstatus change: a revoked token");
{
  const h = harness([{ ok: false, status: 401, description: "Unauthorized" }], {
    order: ANNOUNCED,
  });
  const outcome = await syncStatus(ORDER.id, h.deps);

  check("502", outcome.status === 502);
  check("not recorded as synced — the sweep will retry", h.recorded.length === 0);
}

console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
