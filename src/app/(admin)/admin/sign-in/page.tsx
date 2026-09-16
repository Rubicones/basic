import { Container } from "@/components/ui";
import { BlobMark } from "@/components/brand/blob-mark";
import { SignInForm } from "./form";

/**
 * Sign-in sits outside the guarded `(console)` group, or the guard would redirect
 * the page you are redirected to.
 */

const NOTICES: Record<string, string> = {
  denied: "That account is signed in but is not an administrator.",
  link: "That link has expired or has already been used. Ask for a new one.",
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
