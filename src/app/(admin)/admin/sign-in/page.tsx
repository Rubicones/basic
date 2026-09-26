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
    "Open the link in the same browser you asked for it in. For safety it only works there — " +
    "not in the mail app, not on another device, and not on 127.0.0.1 if you asked on localhost.",
  expired:
    "That link has been used or has expired. Each link works once, and only the newest one " +
    "you asked for. Ask for a new one.",
  link: "That link could not be used. Ask for a new one — the server log has the reason.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <Container width="form">
        <div className="mx-auto max-w-sm">
          <div className="text-brand mb-8 flex items-center gap-3">
            <BlobMark size={32} />
            <p className="font-display text-title font-extrabold">basic console</p>
          </div>

          <SignInForm {...(error && NOTICES[error] ? { notice: NOTICES[error] } : {})} />
        </div>
      </Container>
    </main>
  );
}
