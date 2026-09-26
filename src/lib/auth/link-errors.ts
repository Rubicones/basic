/**
 * Why an emailed sign-in link did not work, in words a person can act on.
 *
 * Every failure used to land on "that link has expired or has already been
 * used", which is true of exactly one of the three things that actually go
 * wrong — and the most common of the three is not it:
 *
 *  · browser  The link was opened in a different browser from the one that asked
 *             for it: the mail app's built-in browser, a phone, Safari when the
 *             console was open in Chrome, or `127.0.0.1` when the form was on
 *             `localhost`. A PKCE link can only be finished where it started — the
 *             other half of the handshake is a cookie in the requesting browser —
 *             so from anywhere else it fails every single time, however fresh.
 *  · expired  Genuinely spent: older than an hour, already clicked, or replaced by
 *             a newer link (asking again invalidates the previous one).
 *  · link     Anything else. The server log has Supabase's own words.
 *
 * Shared by the callback route and the in-browser finish page, so the two cannot
 * classify the same failure differently.
 */

export type LinkFailure = "browser" | "expired" | "link";

export function classifyLinkError(message: string | null | undefined): LinkFailure {
  const text = (message ?? "").toLowerCase();

  if (/code.?verifier|flow.?state|pkce/.test(text)) return "browser";
  if (/expired|otp_expired|already|used|invalid|not found/.test(text)) return "expired";
  return "link";
}
