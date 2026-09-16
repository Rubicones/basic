"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Container, IconSpinner } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export function FinishSignIn() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) {
      setFailed(true);
      router.replace("/admin/sign-in?error=link");
      return;
    }

    void (async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      // The membership check is not repeated here: `/admin` is behind the guard,
      // and one place deciding who may enter is better than two that can drift.
      router.replace(error ? "/admin/sign-in?error=link" : "/admin");
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
