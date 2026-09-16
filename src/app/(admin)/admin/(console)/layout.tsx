import { redirect } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/ui";
import { BlobMark } from "@/components/brand/blob-mark";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

/**
 * The guard, and the chrome around everything behind it.
 *
 * `getUser()` rather than `getSession()`: the session is read from a cookie the
 * browser controls, `getUser` is the one that asks the auth server whether the
 * token is real. Membership is then a second question, asked of the database —
 * so revoking someone is a delete from `admins`, effective on their next request.
 */

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/form", label: "Order form" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/team", label: "Access" },
] as const;

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const demo = env.consoleDemo;
  const email = demo ? "demo@basic.rs" : await requireAdmin();

  return (
    <div className="min-h-screen">
      <header className="border-line bg-surface-raised border-b">
        <Container>
          <div className="flex h-header flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/admin" className="text-brand flex items-center gap-2.5">
              <BlobMark size={24} />
              <span className="font-display text-body font-extrabold">console</span>
            </Link>

            <nav aria-label="Console" className="flex flex-1 flex-wrap items-center gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-body-sm text-content-secondary hover:bg-surface-brand hover:text-brand rounded-pill px-3 py-1.5 transition-surface"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <form action="/admin/auth/sign-out" method="post" className="flex items-center gap-3">
              {demo && (
                <span className="bg-surface-brand text-brand-hover text-micro rounded-pill px-3 py-1 uppercase">
                  Demo data
                </span>
              )}
              <span className="text-caption text-content-secondary hidden sm:inline">{email}</span>
              <button
                type="submit"
                className="text-caption text-content-secondary hover:text-brand rounded-pill px-3 py-1.5 transition-surface"
              >
                Sign out
              </button>
            </form>
          </div>
        </Container>
      </header>

      {demo && (
        <p className="bg-surface-brand text-content-primary text-caption px-5 py-2 text-center lg:px-10">
          Demo mode: everything below is made up, nobody is signed in, and nothing you change is
          saved.
        </p>
      )}

      <main id="main" className="py-10">
        <Container>{children}</Container>
      </main>
    </div>
  );
}

/**
 * Two gates, asked separately, and only when the console is real.
 *
 * `getUser()` asks the auth server whether the token is genuine — not
 * `getSession()`, which only reads a cookie the browser controls. Membership is
 * then a question for the database, so revoking someone is a delete from
 * `admins`, effective on their next request.
 */
async function requireAdmin(): Promise<string> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/sign-in");

  const { data: allowed } = await supabase.rpc("is_admin");
  if (!allowed) redirect("/admin/sign-in?error=denied");

  return user.email ?? "";
}
