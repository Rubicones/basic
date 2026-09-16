"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { SIGN_IN_INITIAL, type SignInState } from "./state";

/**
 * Sign-in is a link in an email.
 *
 * A six-digit code would keep the whole exchange on one screen, but Supabase only
 * lets the email template be edited once a custom SMTP sender is configured, and
 * the stock template sends a link and no `{{ .Token }}`. So: link, and the code
 * path can come back the day SMTP does.
 *
 * The form's answer is the same whether or not the address belongs to an
 * administrator. An unauthenticated form that says "no such user" is an account
 * enumeration endpoint, so an unknown address gets the same "check your mail" and
 * simply never receives anything.
 */

export async function requestLink(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  if (String(formData.get("intent") ?? "") === "restart") return SIGN_IN_INITIAL;

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email.includes("@")) {
    return { sent: false, email, error: "That does not look like an email address." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // The link must come back to the host the request came from, or a link
      // requested on localhost opens the production console.
      emailRedirectTo: `${await currentOrigin()}/admin/auth/callback`,
      // The console's accounts are made deliberately, not by anyone who can type
      // an address into this box.
      shouldCreateUser: false,
    },
  });

  // The response to the browser is the same either way — but silence in both
  // directions is how "200, and no mail ever arrives" becomes undiagnosable. The
  // reason goes to the server log, where only we can read it.
  if (error) {
    console.error("[sign-in] Supabase refused to send:", error.status, error.message);
  }

  return { sent: true, email };
}

async function currentOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) return env.siteUrl;
  const protocol =
    headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}
