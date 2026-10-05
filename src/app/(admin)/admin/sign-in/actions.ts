"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient, type AuthError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { CODE_LENGTH, SIGN_IN_INITIAL, type SignInState, type VerifyState } from "./state";

/**
 * Sign-in is a code in an email, typed back into the same screen.
 *
 * The link it replaces could fail in more ways than anyone could see: opened by
 * the mail app in its own browser, tapped on the phone after asking on the
 * laptop, pre-fetched and used up by a mail scanner before the person ever
 * clicked. A code has none of those — it is only ever used where it is typed.
 *
 * Needs `{{ .Token }}` in the Magic Link email template (and in Confirm signup,
 * which is what an invited address that never signed in receives instead) — see
 * supabase/templates/sign-in-code.html. A template that still has the link in it
 * keeps working too: the link lands on /admin/auth/finish as before.
 *
 * The first step answers the same whether or not the address belongs to an
 * administrator. An unauthenticated form that says "no such user" is an account
 * enumeration endpoint, so an unknown address gets the same "check your mail" and
 * simply never receives anything.
 */

export async function requestCode(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  if (String(formData.get("intent") ?? "") === "restart") return SIGN_IN_INITIAL;

  const email = normaliseEmail(formData.get("email"));

  if (!email.includes("@")) {
    return { sent: false, email, error: "That does not look like an email address." };
  }

  // A throwaway client: nothing is signed in by *sending*, so there is no
  // session to keep and no cookie to write. The implicit flow only matters if
  // the template still carries a link — see ../auth/finish.
  const supabase = createSupabaseClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      flowType: "implicit",
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${await currentOrigin()}/admin/auth/finish`,
      // The console's accounts are made deliberately, not by anyone who can type
      // an address into this box.
      shouldCreateUser: false,
    },
  });

  // The response to the browser is the same either way — but silence in both
  // directions is how "no mail ever arrives" becomes undiagnosable. The reason
  // goes to the server log, where only we can read it.
  if (error) {
    console.error("[sign-in] Supabase refused to send:", error.status, error.code, error.message);
  }

  return { sent: true, email, sentAt: Date.now() };
}

/**
 * Two gates, as with the link. Supabase answers "is this the code we sent to
 * this address"; `admins` answers "may this person use the console". A real
 * session that is not in `admins` is signed straight back out — leaving it alive
 * would hand an anon-key session to anyone who can receive mail.
 *
 * Verified here rather than in the browser so that the session cookies are
 * written by the same response that redirects into the console: the first page
 * behind the guard already sees them.
 */
export async function verifyCode(previous: VerifyState, formData: FormData): Promise<VerifyState> {
  const email = normaliseEmail(formData.get("email"));
  const token = String(formData.get("code") ?? "").replace(/\D/g, "");
  const reject = (error: string): VerifyState => ({ error, rejected: previous.rejected + 1 });

  if (!email.includes("@")) return reject("Start again from your email address.");
  if (token.length !== CODE_LENGTH) return reject(`The code has ${CODE_LENGTH} digits.`);

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });

  if (error) {
    // Never the token itself in the log: a code in a log file is a sign-in
    // waiting to be replayed for the rest of its hour.
    console.error("[sign-in] code refused:", error.status, error.code, error.message);
    return reject(verifyFailure(error));
  }

  const { data: allowed } = await supabase.rpc("is_admin");
  if (!allowed) {
    await supabase.auth.signOut();
    return reject("That account is not an administrator. Ask one to add you under Access.");
  }

  redirect("/admin");
}

/** One sentence per thing the person can do something about. */
function verifyFailure(error: AuthError): string {
  // Supabase answers a wrong code and a stale one with the same `otp_expired`,
  // on purpose — telling them apart would tell a guesser when they were close.
  if (error.code === "otp_expired") {
    return "That code is wrong or has expired. Check the digits, or send a new code.";
  }
  if (error.status === 429 || (error.code ?? "").includes("rate_limit")) {
    return "Too many tries. Wait a few minutes, then try again.";
  }
  return "The code could not be checked just now. Try again in a moment.";
}

function normaliseEmail(value: FormDataEntryValue | null): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

async function currentOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) return env.siteUrl;
  const protocol =
    headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}
