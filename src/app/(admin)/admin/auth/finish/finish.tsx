"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Container, IconSpinner } from "@/components/ui";
import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import { classifyLinkError, reasonCode } from "@/lib/auth/link-errors";

export function FinishSignIn() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    // Supabase puts its refusal in the fragment on this flow —
    // `#error_code=otp_expired&error_description=…` — so read it rather than
    // reporting every failure as the same one.
    if (!accessToken || !refreshToken) {
      const reason = `${params.get("error_code") ?? ""} ${params.get("error_description") ?? ""}`;
      setFailed(true);
      router.replace(signInWith(reason));
      return;
    }

    void (async () => {
      // Told not to read the URL itself: left to its defaults, the browser client
      // parses the fragment by PKCE rules, refuses a token it did not ask for,
      // and races the explicit `setSession` below. This page does the reading.
      const supabase = createBrowserClient(env.supabaseUrl, env.supabaseAnonKey, {
        auth: { detectSessionInUrl: false },
      });
      // The token has done its job; it should not sit in the history entry.
      window.history.replaceState(null, "", window.location.pathname);
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      // The membership check is not repeated here: `/admin` is behind the guard,
      // and one place deciding who may enter is better than two that can drift.
      router.replace(error ? signInWith(`${error.code ?? ""} ${error.message}`) : "/admin");
    })();
  }, [router]);

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <Container width="form">
        <p className="text-body-sm text-content-secondary flex items-center justify-center gap-3">
          <span className="text-brand animate-spin">
            <IconSpinner size={20} />
          </span>
          {failed ? "That link cannot be used." : "Signing you in…"}
        </p>
      </Container>
    </main>
  );
}

/** Back to sign-in, saying which failure it was and Supabase's code for it. */
function signInWith(reason: string): string {
  const query = new URLSearchParams({ error: classifyLinkError(reason) });
  const code = reasonCode(reason);
  if (code) query.set("reason", code);
  return `/admin/sign-in?${query.toString()}`;
}
