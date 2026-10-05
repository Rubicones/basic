import NextLink from "next/link";
import { Container, IconArrowRight } from "@/components/ui";
import { COMPANY, type LegalBlock, type LegalDoc } from "@/lib/legal";
import type { FormAnnex } from "@/lib/legal/annex";
import { fill, formatDate } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/dictionaries";

/**
 * A legal document, laid out like the document it is.
 *
 * Deliberately plain: one reading column, numbered sections, a contents list at
 * the top, the controller's details in a card the way the PDF sets them in a
 * box. The brand shows only in the type and the accents — this is a page people
 * read to find one clause, and decoration would only be in the way.
 */

export function LegalPage({
  doc,
  locale,
  t,
  annex,
}: {
  doc: LegalDoc;
  locale: Locale;
  t: Messages;
  /** Annex 1 of the privacy policy — the live order-form fields. */
  annex?: FormAnnex;
}) {
  const company: [string, string][] = [
    [t.legal.controller, COMPANY.legalName],
    [
      t.legal.address,
      `${COMPANY.street}, ${COMPANY.postcode} ${t.footer.city}, ${t.footer.country}`,
    ],
    [t.legal.registration, `MB ${COMPANY.mb} · PIB ${COMPANY.pib}`],
    [t.legal.contact, `${COMPANY.phone} · ${COMPANY.email}`],
  ];

  return (
    <main id="main" className="pt-header">
      <Container>
        <article className="mx-auto max-w-measure py-12 lg:py-20">
          <NextLink
            href={`/${locale}`}
            className="text-body-sm text-content-secondary hover:text-brand inline-flex items-center gap-2 transition-ink"
          >
            <span className="rotate-180">
              <IconArrowRight size={16} />
            </span>
            {t.legal.back}
          </NextLink>

          <header className="border-line mt-8 border-b pb-8">
            <p className="text-micro text-brand uppercase">{COMPANY.legalName}</p>
            <h1 className="text-display-lg mt-3">{doc.title}</h1>
            <p className="text-body-lg text-content-secondary mt-3">{doc.subtitle}</p>
            <p className="text-caption text-content-secondary mt-4">
              {fill(t.legal.updated, { date: formatDate(locale, doc.updated) })}
            </p>
          </header>

          <dl className="border-line bg-surface-raised mt-8 grid gap-4 rounded-panel border p-6 sm:grid-cols-2">
            {company.map(([label, value]) => (
              <div key={label}>
                <dt className="text-micro text-brand uppercase">{label}</dt>
                <dd className="text-body-sm mt-1 font-medium">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-8 space-y-4">
            {doc.intro.map((block, i) => (
              <Block key={i} block={block} />
            ))}
          </div>

          <nav
            aria-labelledby="legal-contents"
            className="bg-surface-sunken mt-10 rounded-panel p-6"
          >
            <h2 id="legal-contents" className="text-micro text-content-secondary uppercase">
              {t.legal.contents}
            </h2>
            <ol className="text-body-sm mt-3 space-y-1.5">
              {doc.sections.map((section, i) => (
                <li key={section.title} className="flex gap-2">
                  <span className="text-brand w-6 shrink-0 font-bold tabular-nums">{i + 1}.</span>
                  <a href={`#s-${i + 1}`} className="hover:text-brand transition-ink">
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {doc.sections.map((section, i) => (
            <section
              key={section.title}
              id={`s-${i + 1}`}
              aria-labelledby={`s-${i + 1}-title`}
              className="scroll-mt-header mt-12"
            >
              <h2 id={`s-${i + 1}-title`} className="text-title flex gap-3 font-extrabold">
                <span className="text-brand tabular-nums">{i + 1}.</span>
                {section.title}
              </h2>
              <div className="mt-4 space-y-4">
                {section.blocks.map((block, j) => (
                  <Block key={j} block={block} />
                ))}
              </div>
            </section>
          ))}

          {annex && <AnnexSection annex={annex} locale={locale} t={t} />}
        </article>
      </Container>
    </main>
  );
}

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === "string") {
    return (
      <p className="text-body text-content-secondary">
        <Linkified text={block} />
      </p>
    );
  }

  if ("lead" in block) {
    return (
      <p className="text-body text-content-secondary">
        <strong className="text-content-primary font-bold">{block.lead}</strong>{" "}
        <Linkified text={block.text} />
      </p>
    );
  }

  if ("list" in block) {
    return (
      <ul className="text-body text-content-secondary space-y-2">
        {block.list.map((item) => (
          <li key={item} className="flex gap-3">
            <span aria-hidden="true" className="bg-brand mt-2.5 size-1.5 shrink-0 rounded-pill" />
            <span>
              <Labelled text={item} />
            </span>
          </li>
        ))}
      </ul>
    );
  }

  if ("table" in block) {
    return (
      // Three wordy columns do not fit a phone; the table scrolls inside its own
      // box rather than pushing the page sideways.
      <div className="border-line overflow-x-auto rounded-inner border">
        <table className="text-body-sm min-w-measure w-full border-collapse text-left">
          <thead className="bg-surface-sunken">
            <tr>
              {block.table.head.map((cell) => (
                <th key={cell} scope="col" className="text-micro px-4 py-3 align-bottom uppercase">
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.table.rows.map((row) => (
              <tr key={row[0]} className="border-line border-t">
                {row.map((cell, i) =>
                  i === 0 ? (
                    <th key={i} scope="row" className="px-4 py-3 align-top font-bold">
                      {cell}
                    </th>
                  ) : (
                    <td key={i} className="text-content-secondary px-4 py-3 align-top">
                      {cell}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="bg-surface-brand/45 text-body-sm rounded-inner px-5 py-4">
      {block.box.map((line, i) => (
        <p key={line} className={i === 0 ? "font-bold" : "text-content-secondary mt-1"}>
          <Linkified text={line} />
        </p>
      ))}
    </div>
  );
}

/** "Label: rest" → the label in bold — how the PDF sets its definition lists. */
function Labelled({ text }: { text: string }) {
  const colon = text.indexOf(": ");
  if (colon <= 0 || colon > 60) return <Linkified text={text} />;
  return (
    <>
      <strong className="text-content-primary font-bold">{text.slice(0, colon + 1)}</strong>{" "}
      <Linkified text={text.slice(colon + 2)} />
    </>
  );
}

const LINKABLE = /(https?:\/\/[^\s,;)]+[^\s,;).]|[\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g;

/** E-mail addresses and URLs in the running text become links. */
function Linkified({ text }: { text: string }) {
  const parts = text.split(LINKABLE);
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return part;
        const href = part.includes("@") && !part.startsWith("http") ? `mailto:${part}` : part;
        return (
          <a
            key={i}
            href={href}
            className="text-brand break-all underline decoration-1 underline-offset-4 hover:decoration-2"
          >
            {part}
          </a>
        );
      })}
    </>
  );
}

/** Annex 1, from the database: what the form asks right now, and why. */
function AnnexSection({ annex, locale, t }: { annex: FormAnnex; locale: Locale; t: Messages }) {
  const a = t.legal.annex;
  const table = (fields: FormAnnex["fields"]) => ({
    table: {
      head: [a.field, a.status, a.purpose],
      rows: fields.map((f) => [f.label, f.required ? a.required : a.optional, f.purpose]),
    },
  });

  return (
    <section
      id="annex-1"
      aria-labelledby="annex-1-title"
      className="scroll-mt-header border-line mt-16 border-t pt-10"
    >
      <h2 id="annex-1-title" className="text-display-sm">
        {a.title}
      </h2>
      <p className="text-caption text-content-secondary mt-2">
        {fill(a.asOf, { date: formatDate(locale, annex.asOf) })}
      </p>
      <div className="mt-4 space-y-4">
        <Block block={a.intro} />
        <Block block={table(annex.fields)} />
        {annex.special.length > 0 && (
          <>
            <h3 className="text-title mt-8 font-extrabold">{a.specialTitle}</h3>
            <Block block={a.specialBody} />
            <Block block={table(annex.special)} />
          </>
        )}
      </div>
    </section>
  );
}
