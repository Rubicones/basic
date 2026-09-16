/**
 * Internal class joiner. Not exported from the kit's public surface and no
 * component accepts a `className` prop — a one-off style on a primitive is how a
 * design system stops being one. If a screen needs something the kit cannot
 * express, the kit gains a variant, deliberately.
 */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
