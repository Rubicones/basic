import NextLink from "next/link";
import { BlobMark } from "@/components/brand/blob-mark";
import { Wordmark } from "@/components/brand/wordmark";
import { Container, IconArrowRight, Link } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import { COMPANY, LEGAL_SLUGS } from "@/lib/legal";
import { CookieSettingsButton } from "./consent";
import { LOCALES, LOCALE_LABEL, type Locale } from "@/lib/i18n/config";
import { fill } from "@/lib/i18n/format";
import type { Messages } from "@/lib/i18n/dictionaries";

/**
 * The footer: the one dark surface on the site.
 *
 * Everything above it is cream; ending on the ink the hero headline is set in
 * closes the page the way a box closes — and it is where a buyer looks for the
 * legal name, the registration numbers and a phone number, so those are set as
 * plainly as an invoice header. The brand stays in the corner: the mark, and the
 * wordmark again as a watermark, as in the hero.
 *
 * `path` is the page's own path below the locale, so the language links keep a
 * reader on the document they are reading.
 */

type Props = { locale: Locale; t: Messages; path?: string };

const linkClass = "hover:text-brand transition-ink underline-offset-4 hover:underline";

export function Footer({ locale, t, path = "" }: Props) {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-surface-inverse text-content-on-photo relative overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="text-brand/10 absolute -top-20 -right-16 size-72 rotate-12">
          <BlobMark fill />
        </div>
        <span className="font-display text-brand/5 absolute -bottom-10 left-1/2 -translate-x-1/2 text-display-watermark leading-none font-extrabold select-none">
          bas&#x131;c
        </span>
      </div>

      <Container>
        <div className="relative py-14 lg:py-20">
          {/* Lockup and the one thing to do next. */}
          <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
            <div className="max-w-measure">
              <div className="flex items-center gap-3">
                <span className="text-brand">
                  <BlobMark size={56} />
                </span>
                <Wordmark size="lg" />
              </div>
              <p className="font-display text-display-sm mt-6">{t.footer.tagline}</p>
            </div>

            <Link
              href={`/${locale}#order`}
              tone="button"
              size="lg"
              iconEnd={<IconArrowRight size={20} />}
            >
              {t.nav.cta}
            </Link>
          </div>

          <div className="border-content-on-photo/15 mt-12 grid gap-10 border-t pt-10 sm:grid-cols-2 lg:grid-cols-4">
            <Column title={t.footer.company}>
              <p className="font-bold">{COMPANY.legalName}</p>
              <dl className="mt-2 space-y-1">
                <div className="flex gap-2">
                  <dt className="text-content-on-photo/60">{t.footer.mb}</dt>
                  <dd className="tabular-nums">{COMPANY.mb}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-content-on-photo/60">{t.footer.pib}</dt>
                  <dd className="tabular-nums">{COMPANY.pib}</dd>
                </div>
              </dl>
            </Column>

            <Column title={t.footer.address}>
              <address className="not-italic">
                <a
                  href={COMPANY.mapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  {COMPANY.street}
                  <br />
                  {COMPANY.postcode} {t.footer.city}
                  <br />
                  {t.footer.country}
                </a>
              </address>
            </Column>

            <Column title={t.footer.contact}>
              <ul className="space-y-1">
                <li>
                  <a href={COMPANY.phoneHref} className={cx(linkClass, "tabular-nums")}>
                    {COMPANY.phone}
                  </a>
                </li>
                <li>
                  <a href={`mailto:${COMPANY.email}`} className={cx(linkClass, "break-all")}>
                    {COMPANY.email}
                  </a>
                </li>
              </ul>
            </Column>

            <Column title={t.footer.documents}>
              <ul className="space-y-1">
                {LEGAL_SLUGS.map((slug) => (
                  <li key={slug}>
                    <NextLink href={`/${locale}/${slug}`} className={linkClass}>
                      {t.legal.docs[slug]}
                    </NextLink>
                  </li>
                ))}
                <li>
                  <CookieSettingsButton
                    label={t.footer.cookieSettings}
                    className={cx(linkClass, "text-left")}
                  />
                </li>
              </ul>
            </Column>
          </div>

          <div className="border-content-on-photo/15 text-caption text-content-on-photo/60 mt-12 flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {year} {COMPANY.legalName}. {t.footer.rights}
            </p>

            <nav aria-label={t.locale.label}>
              <ul className="flex gap-1">
                {LOCALES.map((l) => (
                  <li key={l}>
                    <NextLink
                      href={`/${l}${path}`}
                      hrefLang={l}
                      lang={l}
                      aria-current={l === locale ? "true" : undefined}
                      aria-label={fill(t.locale.switchTo, { language: LOCALE_LABEL[l] })}
                      className={cx(
                        "rounded-pill px-3 py-1.5 uppercase transition-surface",
                        l === locale
                          ? "bg-content-on-photo/10 text-content-on-photo"
                          : "hover:text-brand",
                      )}
                    >
                      {l}
                    </NextLink>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </Container>
    </footer>
  );
}

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="text-body-sm">
      <p className="text-micro text-brand mb-3 uppercase">{title}</p>
      {children}
    </div>
  );
}
