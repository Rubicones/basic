import type { Messages } from "@/lib/i18n/dictionaries";

/**
 * The order form's field set.
 *
 * The reference fetched this from the backend as `PublicField[]` so the shop owner
 * could edit the form from a console. That console does not exist yet, so the set
 * lives here — in the shape the console will serve, and no other, so swapping the
 * source later is a data change and not a rewrite.
 *
 * What is *not* here is the copy. Labels, placeholders and hints live in the
 * dictionaries, keyed by `key`, because translating a field and adding a field are
 * two different jobs done by two different people.
 */

export type OrderFieldKey = keyof Messages["order"]["fields"];

export type OrderField = {
  key: OrderFieldKey;
  required: boolean;
  /** Spans both columns of the form grid. */
  wide: boolean;
} & (
  | { control: "input"; type: "text" | "tel" | "email" | "date"; autoComplete?: string }
  | { control: "select"; options: "cities" }
  | { control: "textarea"; rows: number }
);

export const ORDER_FIELDS: readonly OrderField[] = [
  { key: "venue", required: true, wide: false, control: "input", type: "text", autoComplete: "organization" },
  { key: "contact", required: true, wide: false, control: "input", type: "text", autoComplete: "name" },
  { key: "phone", required: true, wide: false, control: "input", type: "tel", autoComplete: "tel" },
  { key: "email", required: false, wide: false, control: "input", type: "email", autoComplete: "email" },
  { key: "city", required: true, wide: false, control: "select", options: "cities" },
  { key: "date", required: true, wide: false, control: "input", type: "date" },
  { key: "comment", required: false, wide: true, control: "textarea", rows: 3 },
];

/**
 * The copy for one field.
 *
 * Each entry in the dictionary carries only the keys that field actually uses — a
 * date has no placeholder, a venue has no hint — so the inferred type is a union of
 * seven different shapes. The cast narrows it to the superset the renderer reads;
 * a missing key is still a build error, because the union is what `Messages`
 * enforces on the other two locales.
 */
export function fieldText(t: Messages, key: OrderFieldKey) {
  return t.order.fields[key] as { label: string; placeholder?: string; help?: string };
}
