/**
 * Why an emailed sign-in link did not work, in words a person can act on.
 *
 * The first version of this sorted anything mentioning a code verifier or a flow
 * state into "you opened it in another browser". Three different failures carry
 * those words, and only one of them is about the browser:
 *
 *   · the verifier is missing       → it really was another browser (or the
 *                                      mail app's built-in one)
 *   · the verifier does not match   → an older link, replaced by a newer request
 *   · the flow state has expired    → the link sat in the inbox too long
 *
 * so a person who did everything right in one browser was told they had not.
 * The reason code now travels with the failure too, so the sign-in page can show
 * Supabase's own word for it rather than only ours.
 *
 * Shared by the callback route and the in-browser finish page, so the two cannot
 * classify the same failure differently.
 */

export type LinkFailure = "browser" | "expired" | "link";

export function classifyLinkError(message: string | null | undefined): LinkFailure {
  const text = (message ?? "").toLowerCase();

  // Only the empty-verifier case means the cookie from the request is absent.
  if (/code verifier should be non-empty|both auth code and code verifier/.test(text)) {
    return "browser";
  }

  // Replaced by a newer link, sat too long, already clicked, or never valid.
  if (
    /bad_code_verifier|does not match|flow_state_expired|flow state has expired|flow_state_not_found|no valid flow state|otp_expired|expired|already|used|invalid|not found/.test(
      text,
    )
  ) {
    return "expired";
  }

  return "link";
}

/**
 * Supabase's error code, safe to put in a URL and on the page: lower-case words
 * and underscores only, or nothing.
 */
export function reasonCode(message: string | null | undefined): string | null {
  const match = /\b([a-z]+(?:_[a-z]+)+)\b/.exec((message ?? "").toLowerCase());
  return match?.[1] && match[1].length <= 40 ? match[1] : null;
}
