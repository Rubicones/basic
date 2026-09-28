/**
 * Deliberately not in `actions.ts`.
 *
 * A `"use server"` module may only export async functions: everything else is
 * turned into an action reference, so a plain object exported from there arrives
 * on the client as a callable rather than as state.
 */

/**
 * Digits in the emailed code. Must match Authentication → Sign In / Providers →
 * Email → "Email OTP Length" in the Supabase dashboard (6 unless someone changed
 * it). The form draws this many cells and the server refuses anything else.
 */
export const CODE_LENGTH = 6;

/**
 * Seconds before another code may be asked for — Supabase's own per-address
 * limit (Rate Limits → "sending emails", 60 s by default). The form counts it
 * down rather than letting a second request fail.
 */
export const RESEND_AFTER = 60;

export type SignInState = {
  /** A code was asked for; the form is on its second step. */
  sent: boolean;
  email: string;
  /** When the last code was asked for, epoch ms — drives the resend countdown. */
  sentAt?: number;
  error?: string;
};

export const SIGN_IN_INITIAL: SignInState = { sent: false, email: "" };

export type VerifyState = {
  error?: string;
  /** Grows with every rejected code, so the form can shake and clear each time. */
  rejected: number;
};

export const VERIFY_INITIAL: VerifyState = { rejected: 0 };
