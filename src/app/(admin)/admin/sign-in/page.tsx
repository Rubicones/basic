import { Container } from "@/components/ui";
import { BlobMark } from "@/components/brand/blob-mark";
import { SignInForm } from "./form";

/**
 * Sign-in sits outside the guarded `(console)` group, or the guard would redirect
 * the page you are redirected to.
 */

/** One sentence per failure — see lib/auth/link-errors.ts for which is which. */
const NOTICES: Record<string, string> = {
  denied: "That account is signed in but is not an administrator.",
  browser:
    "That link was sent under the old sign-in and only opens in the browser that asked for it. " +
    "Ask for a new one — new links open anywhere.",
  expired:
    "That link has been used, has expired, or was replaced by a newer one. Each link works " +
    "once, and only the newest one you asked for. Ask for a new one.",
  link: "That link could not be used. Ask for a new one — the server log has the reason.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reason?: string }>;
}) {
  const { error, reason } = await searchParams;
  // Supabase's own code, shown small, so "it still does not work" can come with
  // the one word that says why. Only a code-shaped string is ever echoed.
  const code = reason && /^[a-z_]{1,40}$/.test(reason) ? reason : null;

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <Container width="form">
        <div className="mx-auto max-w-sm">
          <div className="text-brand mb-8 flex items-center gap-3">
            <BlobMark size={32} />
            <p className="font-display text-title font-extrabold">basic console</p>
          </div>

          <SignInForm
            {...(error && NOTICES[error]
              ? { notice: code ? `${NOTICES[error]} (${code})` : NOTICES[error] }
              : {})}
          />
        </div>
      </Container>
    </main>
  );
}
