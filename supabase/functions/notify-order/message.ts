/**
 * The message, and nothing else.
 *
 * Pure on purpose: no Deno, no fetch, no database. Everything here is a string
 * problem, and string problems are the ones worth testing — see
 * `scripts/check-notify-message.ts`, which runs this file under Node precisely
 * because it has no runtime of its own.
 */

export type OrderStatus = "new" | "processing" | "completed" | "canceled";

export type NotifyOrder = {
  id: string;
  number: number;
  created_at: string;
  locale: string;
  total_rsd: number;
  status: OrderStatus;
  /** Counted by the claim, so a log line can say which attempt this was. */
  notify_attempts: number;
  /** Set once announced — the message a status change edits. */
  telegram_message_id?: number | null;
  telegram_chat_id?: number | null;
  /** What the message currently shows; differs from `status` until an edit lands. */
  telegram_status?: OrderStatus | null;
};

export type NotifyItem = {
  name_snapshot: string;
  variant: "piece" | "whole";
  qty: number;
  unit_price_rsd: number;
};

export type NotifyAnswer = {
  field_key: string;
  label_snapshot: string;
  value: string;
  position: number;
};

export type BuildOptions = {
  timeZone: string;
  /** Telegram's hard limit. A parameter so the tests can push against it. */
  limit?: number;
};

/** Telegram refuses a message over this, and a refused message is a lost order. */
export const TELEGRAM_LIMIT = 4096;

/**
 * Every value that came from outside goes through here. No exceptions, and in
 * particular no "this field is a phone number, it is fine" — a form the owner
 * can add fields to has no fields anyone can vouch for.
 *
 * `&` first: escaping it after the others would go back over their semicolons.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * A phone number as Telegram will let us link it.
 *
 * `tel:` is tappable on a phone, which is the difference between a member of
 * staff calling a venue back and a member of staff copying digits by hand. The
 * href is rebuilt from the digits rather than passed through, so nothing a
 * customer types can end up inside the attribute.
 */
function telLink(value: string): string | null {
  const digits = value.replace(/[^\d+]/g, "");
  const normalised = digits.startsWith("+") ? `+${digits.slice(1).replace(/\+/g, "")}` : digits;
  if (normalised.replace(/\D/g, "").length < 6) return null;
  return `<a href="tel:${escapeHtml(normalised)}">${escapeHtml(value)}</a>`;
}

/** A field that holds a telephone number, by key rather than by guessing at text. */
function isPhone(key: string): boolean {
  return /(^|_)(phone|tel|mobile|telefon|telephone)(_|$)/i.test(key);
}

const MONEY = new Intl.NumberFormat("sr-RS", { maximumFractionDigits: 0 });

function money(amount: number): string {
  return `${MONEY.format(amount)} RSD`;
}

/**
 * The time, where the shop is.
 *
 * Not UTC, and not whatever locale the function's runtime happens to have: the
 * person reading this is standing in Belgrade, and "14:32" has to mean the
 * fourteen-thirty they just lived through.
 */
function when(iso: string, timeZone: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return escapeHtml(iso);

  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(",", "");
}

const LANGUAGE: Record<string, string> = {
  sr: "srpski",
  ru: "русский",
  en: "English",
};

/**
 * The status line, which is the part of the message that changes.
 *
 * A mark as well as a word: in a chat scrolled at speed, the column of marks down
 * the left edge is what tells you which orders are still open. Never the mark
 * alone — the word is what a screen reader, and a tired person, actually reads.
 */
export const STATUS_LINE: Record<OrderStatus, string> = {
  new: "🆕 <b>Nova</b>",
  processing: "⏳ <b>U obradi</b>",
  completed: "✅ <b>Završena</b>",
  canceled: "❌ <b>Otkazana</b>",
};

export function buildMessage(
  order: NotifyOrder,
  items: NotifyItem[],
  answers: NotifyAnswer[],
  options: BuildOptions,
): string {
  const limit = options.limit ?? TELEGRAM_LIMIT;

  // "Porudžbina", not "Nova porudžbina": the message outlives the order being
  // new, and the headline should not start lying the moment it is edited.
  const head = [
    `<b>Porudžbina #${escapeHtml(order.number)}</b> · ${STATUS_LINE[order.status] ?? escapeHtml(order.status)}`,
    `${escapeHtml(when(order.created_at, options.timeZone))} · ` +
      `${escapeHtml(LANGUAGE[order.locale] ?? order.locale)} (${escapeHtml(order.locale)})`,
  ].join("\n");

  const lines = items.map((item) => {
    const name =
      item.variant === "whole"
        ? `${escapeHtml(item.name_snapshot)} <i>(cela torta)</i>`
        : escapeHtml(item.name_snapshot);
    const total = item.unit_price_rsd * item.qty;
    return `• ${name} — ${escapeHtml(item.qty)} × ${escapeHtml(money(item.unit_price_rsd))} = <b>${escapeHtml(money(total))}</b>`;
  });

  const contact = [...answers]
    .sort((a, b) => a.position - b.position)
    .map((answer) => {
      const label = escapeHtml(answer.label_snapshot || answer.field_key);
      const value = isPhone(answer.field_key)
        ? (telLink(answer.value) ?? escapeHtml(answer.value))
        : escapeHtml(answer.value);
      return `<b>${label}:</b> ${value}`;
    });

  const total = `<b>Ukupno: ${escapeHtml(money(order.total_rsd))}</b>`;

  const assemble = (itemCount: number, answerCount: number): string => {
    const shownItems = lines.slice(0, itemCount);
    const omittedItems = lines.length - itemCount;
    const shownAnswers = contact.slice(0, answerCount);
    const omittedAnswers = contact.length - answerCount;

    const itemBlock = [
      ...shownItems,
      ...(omittedItems > 0
        ? [`<i>… i još ${escapeHtml(omittedItems)} stavki — cela lista je u konzoli.</i>`]
        : []),
    ].join("\n");

    const answerBlock = [
      ...shownAnswers,
      ...(omittedAnswers > 0
        ? [`<i>… i još ${escapeHtml(omittedAnswers)} polja — u konzoli.</i>`]
        : []),
    ].join("\n");

    return [head, itemBlock, total, answerBlock].filter(Boolean).join("\n\n");
  };

  /*
   * Too long is solved by dropping whole lines, never by cutting the string.
   * A message sliced at 4096 characters ends inside a tag or an entity about as
   * often as not, and Telegram refuses the malformed result — which turns "the
   * order was large" into "the order vanished".
   *
   * The items go first: forty of them is a good day, and the phone number is
   * what somebody actually needs. The answers go second. What is left after
   * that is a number, a total and where to look, which always fits.
   */
  let itemCount = lines.length;
  let answerCount = contact.length;
  let message = assemble(itemCount, answerCount);

  while (message.length > limit && itemCount > 0) {
    itemCount -= 1;
    message = assemble(itemCount, answerCount);
  }

  while (message.length > limit && answerCount > 0) {
    answerCount -= 1;
    message = assemble(itemCount, answerCount);
  }

  if (message.length > limit) {
    message = [head, total, "<i>Cela porudžbina je u konzoli.</i>"].join("\n\n");
  }

  return message;
}

/**
 * The push notification for a new order.
 *
 * Plain text: a lock screen renders no HTML, so nothing here is escaped — and
 * nothing here is ever interpreted as markup either. Short, because iOS shows two
 * lines and Android about three: who, how much, how many.
 */
export function buildPushMessage(
  order: NotifyOrder,
  items: NotifyItem[],
  answers: NotifyAnswer[],
): { title: string; body: string; url: string; tag: string } {
  const who =
    answers.find((answer) => answer.field_key === "venue")?.value ??
    answers.find((answer) => answer.field_key === "contact")?.value ??
    [...answers].sort((a, b) => a.position - b.position)[0]?.value ??
    "";

  const pieces = items.reduce((sum, item) => sum + item.qty, 0);

  return {
    title: `Nova porudžbina #${order.number}`,
    body: [who.slice(0, 60), `${pieces} kom.`, money(order.total_rsd)].filter(Boolean).join(" · "),
    url: `/admin/orders/${order.id}`,
    // One notification per order: a second push for the same order replaces the
    // first instead of stacking.
    tag: `order-${order.id}`,
  };
}
