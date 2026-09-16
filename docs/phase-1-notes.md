# Phase 1 — foundation

Built and verified. Nothing from the reference was copied; the token layer comes from
`design-audit.md`, everything else is written for this stack.

## What exists

```
basic/
  src/
    app/[locale]/     layout (root — carries <html lang>), page (placeholder), not-found, error
    app/robots.ts     app/sitemap.ts
    middleware.ts     locale detection; redirects "/" and nothing else
    lib/i18n/         config, negotiate, dictionaries, format, messages/{en,sr,ru}
    lib/supabase/     browser + server clients (anon key, so RLS stays in force)
    lib/env.ts        typed access, lazy — a missing var throws with its own name
    lib/seo.ts        canonical + hreflang builder
    styles/globals.css  the token layer
    styles/fonts.ts     self-hosted Outfit + DM Sans
  scripts/check-arbitrary.mjs   fails the build on bracket values and raw colors
  docs/
```

Zero runtime dependencies beyond Next, React, Tailwind and Supabase. No state library, no
animation library, no component library.

## Verified, not assumed

Locale negotiation, run against a production build:

| Accept-Language | result |
|---|---|
| `sr-Latn-RS,sr;q=0.9,en;q=0.8` | `/sr` |
| `sr-RS`, `sr-Cyrl` | `/sr` |
| `ru-RU,ru;q=0.9`, `ru-BY` | `/ru` |
| `de, sr;q=0.8, en;q=0.9` | `/en` — ranked by q, not by position |
| `sr;q=0, ru` | `/ru` — q=0 is a veto, not a low preference |
| `ja,ko`, `*`, absent | `/en` |
| cookie `ru` + header `sr` | `/ru` — an explicit switch wins from then on |
| cookie `zz` + header `sr` | `/sr` — a garbage cookie falls through to the header |

- `/sr`, `/ru`, `/en` return **200 and are never redirected**, even against a conflicting
  Accept-Language. Only `/` redirects, at 307, with `Vary: Accept-Language, Cookie`.
- `/zz` is a 404, not a redirect — a typo must not resolve to a real page.
- `<html lang>` renders `en` / `sr-Latn-RS` / `ru-RU`.
- Full hreflang set plus `x-default` → en on every page; each page self-canonical.
- `sitemap.xml` emits all three URLs per page with the same alternates.
- Plurals go through `Intl.PluralRules`: `1 piece · 2 pieces · 5 pieces · 21 pieces`, with
  Serbian one/few/other and Russian one/few/many/other already in the dictionaries.
- `tsc --noEmit`, `eslint`, the arbitrary-value check and `next build` all pass.
- 103 kB first-load JS; all three locales prerendered.

A missing translation key is a **type error**, so the build fails — never a raw key on
screen, never a silent fallback. `count === 1 ? x : y` is an ESLint error, so the wrong
plural cannot be written by hand.

## Three things that came up

### 1. The brand fonts have no Cyrillic — decision needed

Neither Outfit nor DM Sans ships a Cyrillic subset. Serbian Latin is covered — č ć š ž đ and
the dotless ı of the wordmark, verified glyph by glyph in the shipped files. Russian falls
back to a system face, so one locale in three loses the brand entirely.

- **Replace both families** with Cyrillic-capable ones everywhere. One system, no divergence;
  costs the current typographic character.
- **Keep Outfit + DM Sans for sr/en, add a Cyrillic pair for ru only.** The layout already
  knows the locale, so this is a conditional font variable. Two type systems to maintain, and
  ru looks subtly different — though it is different today anyway, just worse.
- **Ship as is.** Russian renders in the system UI font. Cheapest, and it looks it.

Not my call to make — it changes the brand.

### 2. Fonts are self-hosted rather than fetched from Google

Your machine's network allows npm but not `fonts.googleapis.com`, so `next/font/google` could
not fetch at build time. Self-hosting is better regardless: the build stops depending on a
network call, and no visitor request leaves for a third party. Each file is latin + latin-ext
merged into one woff2 per weight, from the Fontsource distribution of the same fonts.

Only Outfit is preloaded, because the hero heading is the LCP element. Preloading all five
faces put ~90 kB of fonts ahead of the LCP paint; body text swaps in without layout shift
because `adjustFontFallback` metric-matches the fallback.

### 3. Delete permission on the folder

`next build` clears `.next` before every run, and the bridge blocks deletion by default —
which is why the first builds hung with no output instead of failing. Granted for this
session only.

## Still open from Phase 0

1. **Brand darkening** — `--brand-ink` `oklch(0.55 0.145 34)` for anything text touches.
   Implemented, because something had to build; reverting is one line in `globals.css`.
   As it stands the CTA passes AA at 5.05:1 instead of failing at 2.97:1.
2. **Control borders** — `--line-control` at 3.05:1. Same: implemented, one line to revert.

---

# Localized content — schema proposal

Proposed here, **not migrated**. No migration is written until you choose.

The localized fields are `products.name`, `products.note`, `categories.label`, and later the
admin-editable form field labels, placeholders and validation messages.

## A. Localized columns — `name_sr`, `name_ru`, `name_en`

**For.** Simplest to read: one row, no joins. Per-field fallback is `coalesce(name_sr,
name_en)` in the query. Constraints work normally — `name_en text not null` makes the
fallback guaranteed *by the database*, which no other option manages as cleanly. Indexing one
locale's column for search is trivial.

**Against.** A fourth locale is a migration touching every localized table, and columns grow
as fields × locales. Generic admin code has to assemble column names as strings, which is
where a typo becomes a runtime bug.

## B. `translations` jsonb — `{"sr": {...}, "ru": {...}, "en": {...}}`

**For.** Adding a locale is a data change, not a migration. One column no matter how many
localized fields. Maps directly onto a dictionary-shaped admin form.

**Against.** No meaningful constraints inside jsonb — nothing stops a row shipping as
`{"sr": {}}`, so "English is always present" becomes an application promise rather than a
database one. Queries get noisier, and ordering or searching by name needs an expression
index per locale, which is the work jsonb was supposed to save. The TS type asserts a shape
the database is not enforcing.

## C. Side table — `product_translations(product_id, locale, name, note)`

**For.** `primary key (product_id, locale)` plus a `locale` enum makes malformed data
impossible. A new locale is pure data. Each row can carry its own `updated_at`,
`translated_by`, or a needs-review flag, which matters once translation is someone's job
rather than a field in a form. Constraints, indexes and full-text search all behave normally.

**Against.** Every read is a join and every write is two statements. RLS has to be written for
the side table too. Saving a product and its three translations becomes a transaction.

## What I would pick, and why

**C**, with one deliberate exception.

The reason is the admin panel, not the database. Your brief says an empty Serbian description
falls back to English *and the admin must make that gap visible*. Showing a gap means querying
for it — "which products have no Serbian description" is a `left join … where null` against C,
an expression scan against B, and a column-by-column `is null` sweep against A. Only C answers
"what still needs translating" as an ordinary query, and with 19 SKUs across three languages
that question gets asked constantly.

Per-field fallback is then a `coalesce` over the joined rows, resolved once in the data layer,
so no component ever sees a null.

The exception: **A for the order form's field config.** That table is small, fixed, read on
every page render, and its localized strings are labels and placeholders that only change
together. A join per render to fetch six labels is not worth it.

If you would rather not carry two conventions, B is the compromise I would accept — but then
with a `check (translations ? 'en')` so the fallback locale is enforced, and a generated
column for the English name so ordering and search stay sane.

**Decision needed before any migration is written.**
