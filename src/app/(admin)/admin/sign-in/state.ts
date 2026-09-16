/**
 * Deliberately not in `actions.ts`.
 *
 * A `"use server"` module may only export async functions: everything else is
 * turned into an action reference, so a plain object exported from there arrives
 * on the client as a callable rather than as state.
 */

export type SignInState = {
  sent: boolean;
  email: string;
  error?: string;
};

export const SIGN_IN_INITIAL: SignInState = { sent: false, email: "" };
