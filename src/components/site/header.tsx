"use client";

import NextLink from "next/link";
import { BlobMark } from "@/components/brand/blob-mark";
import { Wordmark } from "@/components/brand/wordmark";
import { Container, IconArrowRight, Link } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import type { Messages } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";

/**
 * The site header.
 *
 * On a phone it is the mark and one call to action, and nothing else. There was a
 * menu behind a hamburger; the page is a single scroll with three anchors in it,
 * and a button that opens a list of places you can already reach by scrolling is a
 * tax on the only two things up there that matter.
 *
 * The lockup is a link to the top. The reference made it a `<div>`.
 *
 * Height comes from `--header-h`, which the hero and every anchored section also
 * read — the reference guessed it as 96px in one file and 80px in another.
 */

type Props = { locale: Locale; t: Messages };

export function Header({ locale, t }: Props) {
  const links = [
    { href: `/${locale}#catalog`, label: t.nav.catalog },
    { href: `/${locale}#order`, label: t.nav.order },
    { href: `/${locale}#business`, label: t.nav.business },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <Container>
        <div className="h-header flex items-center justify-between gap-4">
          <NextLink
            href={`/${locale}`}
            aria-label={t.nav.home}
            className="bg-surface-page/85 flex items-center gap-3 rounded-pill p-2 backdrop-blur-md sm:py-2 sm:pr-5 sm:pl-3"
          >
            <span className="text-brand">
              <BlobMark size={32} />
            </span>
            {/* Below 640px the mark carries the lockup on its own — the wordmark
                and the call to action together overflow a 320px header. The link
                keeps its accessible name either way. */}
            <span className="hidden sm:block">
              <Wordmark size="sm" tagline={t.nav.tagline} />
            </span>
          </NextLink>

          <nav
            aria-label={t.nav.primary}
            className="bg-surface-page/85 hidden items-center gap-8 rounded-pill px-7 py-3 backdrop-blur-md md:flex"
          >
            {links.map((link) => (
              <NavLink key={link.href} href={link.href} label={link.label} />
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href={`/${locale}#order`} tone="button" iconEnd={<IconArrowRight size={16} />}>
              {t.nav.cta}
            </Link>
          </div>
        </div>
      </Container>
    </header>
  );
}

/**
 * The underline grows from the left on hover and on focus. The reference bound it
 * to `:hover` alone, so a keyboard user got no indication at all.
 */
function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <NextLink
      href={href}
      className={cx(
        "text-body-sm text-content-primary hover:text-brand transition-ink relative font-medium",
        "after:bg-brand after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full",
        "after:origin-right after:scale-x-0 after:transition-transform after:duration-fast",
        "hover:after:origin-left hover:after:scale-x-100",
        "focus-visible:after:origin-left focus-visible:after:scale-x-100",
      )}
    >
      {label}
    </NextLink>
  );
}
