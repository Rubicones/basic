/**
 * The notification message, checked.
 *
 * `message.ts` is deliberately free of Deno, fetch and the database, which is
 * what lets it run here under Node's type stripping:
 *
 *   node --experimental-strip-types scripts/check-notify-message.ts
 *
 * What is checked is what loses orders: an unescaped angle bracket (Telegram
 * refuses the whole message), a message over 4096 characters (same), and a
 * truncation that cuts through a tag (same again, but only on a big order, which
 * is the one nobody wants to lose).
 */

import {
  buildMessage,
  escapeHtml,
  TELEGRAM_LIMIT,
} from "../supabase/functions/notify-order/message.ts";
import type {
  NotifyAnswer,
  NotifyItem,
  NotifyOrder,
} from "../supabase/functions/notify-order/message.ts";

let failures = 0;

function check(name: string, condition: boolean, detail = ""): void {
  if (condition) {
    console.log(`  ok   ${name}`);
  } else {
    failures += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

/** Every `<` in the output has to be the start of a tag we wrote ourselves. */
const ALLOWED_TAGS = /^(<\/?[bi]>|<\/a>|<a href="tel:[^"<>]*">)$/;

function tagsAreOurs(message: string): boolean {
  return (message.match(/<[^>]*>/g) ?? []).every((tag) => ALLOWED_TAGS.test(tag));
}

/** No stray `<` or `&` outside the tags and entities we produced. */
function escapingIsClean(message: string): boolean {
  const withoutTags = message.replace(/<[^>]*>/g, "");
  if (withoutTags.includes("<") || withoutTags.includes(">")) return false;
  return !/&(?!(amp|lt|gt);)/.test(withoutTags);
}

function order(over: Partial<NotifyOrder> = {}): NotifyOrder {
  return {
    id: "8f1c2f4e-0000-4000-8000-000000000001",
    number: 42,
    // 21:15 UTC — the next day in Belgrade only if the zone is wrong, which is
    // the mistake this fixture exists to catch.
    created_at: "2026-09-24T21:15:00.000Z",
    locale: "ru",
    total_rsd: 12_340,
    status: "new",
    notify_attempts: 1,
    ...over,
  };
}

const OPTIONS = { timeZone: "Europe/Belgrade" };

console.log("escaping");
{
  const hostile = '<script>alert("x")</script> Tom & Jerry';
  const message = buildMessage(
    order(),
    [{ name_snapshot: `Torta ${hostile}`, variant: "piece", qty: 2, unit_price_rsd: 570 }],
    [
      { field_key: "contact", label_snapshot: "Ime & prezime", value: hostile, position: 0 },
      { field_key: "comment", label_snapshot: "Komentar <b>", value: "1 < 2 & 3 > 2", position: 1 },
    ],
    OPTIONS,
  );

  check("no raw angle brackets survive", escapingIsClean(message));
  check(
    "every tag is one we wrote",
    tagsAreOurs(message),
    message.match(/<[^>]*>/g)?.join(" ") ?? "",
  );
  check("the script tag is inert", !message.includes("<script>"));
  check("the ampersand is an entity", message.includes("Tom &amp; Jerry"));
  check("escapeHtml is not double-escaping", escapeHtml("a & b") === "a &amp; b");
}

console.log("\ntime and language");
{
  const message = buildMessage(order(), [], [], OPTIONS);
  check(
    "written in the shop's zone, not UTC",
    message.includes("24/09/2026 23:15"),
    message.split("\n")[1] ?? "",
  );
  check(
    "says which language to call back in",
    message.includes("русский") && message.includes("(ru)"),
  );
  check("carries the order number", message.includes("#42"));
}

console.log("\nphone");
{
  const message = buildMessage(
    order(),
    [],
    [{ field_key: "phone", label_snapshot: "Telefon", value: "+381 (64) 123-4567", position: 0 }],
    OPTIONS,
  );
  check("is a tappable link", message.includes('<a href="tel:+38164123456'), message);

  const hostile = buildMessage(
    order(),
    [],
    [{ field_key: "phone", label_snapshot: "Telefon", value: '+381"><b>64', position: 0 }],
    OPTIONS,
  );
  check("cannot break out of the href", tagsAreOurs(hostile) && escapingIsClean(hostile), hostile);
}

console.log("\na very large order");
{
  const items: NotifyItem[] = Array.from({ length: 40 }, (_, i) => ({
    name_snapshot: `Kolač sa dugačkim imenom broj ${i + 1} & još malo teksta`,
    variant: i % 5 === 0 ? "whole" : "piece",
    qty: 3 + (i % 7),
    unit_price_rsd: 450 + i * 37,
  }));
  const answers: NotifyAnswer[] = Array.from({ length: 7 }, (_, i) => ({
    field_key: i === 2 ? "phone" : `field_${i}`,
    label_snapshot: `Polje ${i}`,
    value: i === 2 ? "+381 64 123 4567" : "x".repeat(60),
    position: i,
  }));

  const message = buildMessage(order({ total_rsd: 987_654 }), items, answers, OPTIONS);

  check("fits Telegram's limit", message.length <= TELEGRAM_LIMIT, `${message.length} characters`);
  check("says how many were left out", /još \d+ stavki/.test(message), message.slice(-200));
  check("no tag was cut in half", tagsAreOurs(message));
  check("the total survived the cut", message.includes("Ukupno"));
  check("the phone survived the cut", message.includes('href="tel:'));

  const fits = buildMessage(order(), items.slice(0, 6), answers, OPTIONS);
  check(
    "a normal order is not truncated",
    !/još \d+ stavki/.test(fits),
    `${fits.length} characters`,
  );
}

console.log("\nan order that is nothing but oversized answers");
{
  const answers: NotifyAnswer[] = Array.from({ length: 30 }, (_, i) => ({
    field_key: `field_${i}`,
    label_snapshot: `Polje ${i}`,
    value: "ж".repeat(300),
    position: i,
  }));
  const message = buildMessage(order(), [], answers, OPTIONS);

  check("still fits", message.length <= TELEGRAM_LIMIT, `${message.length} characters`);
  check("still valid markup", tagsAreOurs(message) && escapingIsClean(message));
  check("still says the total", message.includes("Ukupno"));
}

console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
