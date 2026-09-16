import { BlobMark } from "@/components/brand/blob-mark";
import { Wordmark } from "@/components/brand/wordmark";
import { Badge, Container, IconArrowRight, Link } from "@/components/ui";
import type { Messages } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";

/**
 * The hero.
 *
 * A server component with no JavaScript of its own. The entrance is `rise-group`,
 * a CSS animation with `both` fill — so the heading is in the HTML and paints
 * immediately, rather than waiting behind hydration at `opacity: 0` the way the
 * reference's did with its own LCP element.
 *
 * The decoration is two static marks and one slow drift. The reference ran three
 * infinite loops plus an animated full-bleed 28px blur, which is a continuous
 * full-screen composite for a background wash.
 */

export function Hero({ locale, t }: { locale: Locale; t: Messages }) {
  return (
    <section className="border-line bg-surface-raised relative overflow-hidden border-b">
      {/* Decoration. Inert, and outside the content flow so it can never affect it. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="text-brand/15 drift-slow absolute -top-16 -right-16 size-56 md:size-72">
          <BlobMark fill />
        </div>
        <div className="text-brand/10 absolute bottom-24 -left-14 size-40 -rotate-12 sm:-left-10 sm:size-56">
          <BlobMark fill />
        </div>
        {/* The wordmark watermark. `select-none` because it is decoration that
            would otherwise land in a copied selection of the page. */}
        <span className="font-display text-brand/5 bottom-watermark absolute left-1/2 -translate-x-1/2 text-display-watermark leading-none font-extrabold select-none">
          bas&#x131;c
        </span>
      </div>

      <Container>
        <div className="min-h-hero pt-header flex items-center pb-16 md:pb-20">
          <div className="rise-group relative mx-auto flex w-full max-w-measure flex-col items-center text-center">
            <div className="mb-6 flex flex-col items-center gap-3 md:mb-8">
              <span className="text-brand">
                <BlobMark size={56} />
              </span>
              <Wordmark size="lg" />
            </div>

            <div className="mb-6">
              <Badge tone="brand" iconStart={<PinGlyph />}>
                {t.hero.location}
              </Badge>
            </div>

            {/* The measure is a rem token, not a ch value. The reference sized this
                in ch, tuned to the English string, which gives a different line
                count in Serbian and Russian. */}
            <h1 className="text-display-xl text-content-primary max-w-headline">
              <span className="block">{t.hero.headlineTop}</span>
              <span className="text-brand mt-2 block text-display-sub leading-none md:mt-3">
                {t.hero.headlineBottom}
              </span>
            </h1>

            <p className="text-body-lg text-content-secondary mt-7 max-w-measure md:mt-9">
              {t.hero.lead}
            </p>

            <div className="mt-8 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center md:mt-10">
              <Link
                href={`/${locale}#catalog`}
                tone="button"
                size="lg"
                iconEnd={<IconArrowRight size={20} />}
              >
                {t.hero.ctaPrimary}
              </Link>
              <Link href={`/${locale}#business`} tone="buttonOutline" size="lg">
                {t.hero.ctaSecondary}
              </Link>
            </div>

            <p
              aria-hidden="true"
              className="text-micro text-content-secondary mt-10 flex flex-col items-center gap-3 uppercase md:mt-12"
            >
              <span className="from-brand bg-linear-to-b to-transparent h-10 w-px" />
              {t.hero.scrollCue}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}

function PinGlyph() {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
