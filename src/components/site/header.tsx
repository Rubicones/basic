"use client";

import { useEffect, useState } from "react";
import NextLink from "next/link";
import { BlobMark } from "@/components/brand/blob-mark";
import { Wordmark } from "@/components/brand/wordmark";
import { Container, IconArrowRight, IconClose, Link } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import type { Messages } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";

/**
 * The site header.
 *
 * Two deviations from the reference, both deliberate:
 *
 * 1. There is a mobile menu. The reference's nav was `hidden … md:flex` with
 *    nothing behind it, so below 768px a third of the site's navigation simply did
 *    not exist and the header offered one button.
 * 2. The lockup is a link to the top. The reference made it a `<div>`.
 *
 * Height comes from `--header-h`, which the hero and every anchored section also
 * read — the reference guessed it as 96px in one file and 80px in another.
 */

type Props = { locale: Locale; t: Messages };

export function Header({ locale, t }: Props) {
  const [open, setOpen] = useState(false);

  // A resize past the breakpoint leaves the panel open but its trigger hidden.
  useEffect(() => {
    if (!open) return;
    const media = window.matchMedia("(min-width: 768px)");
    const close = () => setOpen(false);
    media.addEventListener("change", close);
    return () => media.removeEventListener("change", close);
  }, [open]);

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
            {/* Below 640px the mark carries the lockup on its own: logo, CTA and menu
                button together overflow a 320px header. The link keeps its
                accessible name either way. */}
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

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="site-menu"
              aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
              className={cx(
                "border-line bg-surface-page/85 grid size-11 place-items-center rounded-pill border",
                "text-content-primary transition-surface hover:border-brand hover:text-brand md:hidden",
              )}
            >
              {open ? <IconClose size={20} /> : <MenuGlyph />}
            </button>
          </div>
        </div>
      </Container>

      {/* The panel is always in the DOM so it can transition, and `hidden` keeps it
          out of the accessibility tree and the tab order while closed. */}
      <div
        id="site-menu"
        hidden={!open}
        className="border-line bg-surface-page/95 border-b backdrop-blur-xl md:hidden"
      >
        <Container>
          <ul className="flex flex-col py-2">
            {links.map((link) => (
              <li key={link.href}>
                <NextLink
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="text-body text-content-primary hover:text-brand transition-ink block py-3"
                >
                  {link.label}
                </NextLink>
              </li>
            ))}
          </ul>
        </Container>
      </div>
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

function MenuGlyph() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}
