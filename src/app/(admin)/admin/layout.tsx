import type { Metadata } from "next";
import { fontClassNames } from "@/styles/fonts";
import "@/styles/globals.css";

/**
 * The console's root layout — the second one in the app.
 *
 * Next allows two root layouts only through route groups, which is why the site
 * moved into `(site)`. The alternative was a shared `app/layout.tsx`, and that
 * would have cost the thing the whole i18n design rests on: `<html lang>` being
 * the rendered locale rather than a constant.
 *
 * The console is English only. One person uses it, and a URL nobody indexes does
 * not need three of them.
 */

export const metadata: Metadata = {
  title: "basic console",
  // A console has no business in anyone's index.
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontClassNames("en")}>
      <body className="bg-surface-page text-content-primary">{children}</body>
    </html>
  );
}
