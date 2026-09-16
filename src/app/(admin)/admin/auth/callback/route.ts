import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Where the emailed link lands.
 *
 * Supabase's `verify` endpoint hands the session back in one of three shapes, and
 * which one depends on settings we do not control from here — so all three are
 * handled rather than assumed:
 *
 *   ?code=…                    PKCE. Exchanged for a session, server-side.
 *   ?token_hash=…&type=…       The template's own hash. Verified server-side.
 *   #access_token=…            The implicit flow. A fragment is never sent to the
 *                              server, so this one can only be finished in the
 *                              browser — see ./finish.
 *
 * Assuming the first is what produced "that link has expired" for a link that had
 * just been issued: there was no `code`, so the only branch that existed fell
 * through to the error.
 *
 * Two gates either way. Supabase answers "is this a valid one-time credential";
 * `admins` answers "may this person use the console". A real session that is not
 * in `admins` is signed straight back out — leaving it alive would hand an
 * anon-key session to anyone who can receive mail.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const signIn = new URL("/admin/sign-in", url.origin);
  const failed = (reason: string) => {
    console.error("[auth/callback]", reason, Object.fromEntries(url.searchParams));
    signIn.searchParams.set("error", "link");
    return NextResponse.redirect(signIn);
  };

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return failed(`exchange: ${error.message}`);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) return failed(`verify: ${error.message}`);
  } else {
    // Nothing in the query string. The credential may be in the fragment, which
    // only the browser can read — so hand over to a page that can.
    return NextResponse.redirect(new URL("/admin/auth/finish", url.origin));
  }

  const { data: allowed } = await supabase.rpc("is_admin");
  if (!allowed) {
    await supabase.auth.signOut();
    signIn.searchParams.set("error", "denied");
    return NextResponse.redirect(signIn);
  }

  return NextResponse.redirect(new URL("/admin", url.origin));
}
