/**
 * Limits both the form and the action need.
 *
 * In their own module because `actions.ts` is `"use server"`: everything exported
 * from such a file crosses to the client as a server-action reference, whatever it
 * was declared as. A constant exported from there arrives as a function — which is
 * how the sign-in form once ended up printing "Sent to undefined".
 */

/** The corner tag is a word, not a sentence — the table says the same. */
export const TAG_MAX = 24;
