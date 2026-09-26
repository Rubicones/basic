# Phase 4 — content in the database, and the console

Two decisions were taken before any SQL was written. Both are recorded here because
both close options that were open in `phase-1-notes.md`.

## Decision 1 — localised content lives in side tables

`product_translations (product_id, locale, name, note)` and
`order_field_translations (field_id, locale, label, placeholder, help)`, each keyed by
`(parent, locale)`, with `locales` a **table** rather than an enum so a fourth language
is an INSERT.

The cost is the one thing localised columns gave for free: `name_en text not null`
would have made "English always exists" a column constraint. A side table cannot
express that, so it is enforced instead as an invariant on _publishing_:

- `products_default_translation` / `order_fields_default_translation` — deferred
  constraint triggers. A row may be drafted in one language; it cannot be published or
  enabled without a translation in the default locale.
- `product_translations_keep_default` / `order_field_translations_keep_default` — the
  same rule from the other side, so the default translation cannot be deleted out from
  under a row that is already live.

Deferred, so the console can insert a product and its three translations in one
transaction without ordering the statements by hand.

## Decision 2 — the console signs in with a magic link

Supabase Auth, email link, and a separate `admins` table that turns a signed-in user
into an administrator. `is_admin()` is a `security definer` function, and every RLS
policy calls it. Revoking access is a `delete from admins` — not a redeploy, and not a
shared secret anyone has to remember to rotate.

## What RLS allows

| table                                      | anon                    | admin      |
| ------------------------------------------ | ----------------------- | ---------- |
| `locales`                                  | read                    | read       |
| `products`, `product_translations`         | read **when published** | everything |
| `order_fields`, `order_field_translations` | read **when enabled**   | everything |
| `orders`, `order_items`, `order_answers`   | nothing                 | everything |
| `admins`                                   | nothing                 | read       |
| `storage: product-photos`                  | read                    | everything |

Orders have no anonymous INSERT policy, deliberately. A public insert would let anyone
post their own `total_rsd`, and a cart the client prices is a cart the client can
discount. Submission will land as a `security definer` function that takes slugs,
variants and quantities, recomputes every line from `products`, and writes the order
itself — so the total is never a number that arrived over the wire.

## Snapshots in orders

`order_items.unit_price_rsd` and `name_snapshot`, and `order_answers.label_snapshot`,
copy what the customer actually saw. A later price edit or a relabelled field must not
rewrite an order that has already been placed, and `product_id` is
`on delete set null` for the same reason — deleting a product must not delete history.

## The seed

`supabase/seed.sql` is **generated** by `npm run seed` from the fixtures the site
already ships — `products.ts`, `photos.json` and the three dictionaries — so the two
cannot drift while both exist. It is idempotent: every insert is an upsert, so running
it against a populated database updates rather than duplicates.

One refactor came out of this: `photoFor` and its `photos.json` import moved to
`src/lib/catalog/photos.ts`, leaving `products.ts` a pure data module that a plain Node
script can import.

## The console shell

`app/` now has two root layouts, which Next allows only through route groups:
`app/(site)/[locale]/layout.tsx` and `app/(admin)/admin/layout.tsx`. The alternative
was one shared `app/layout.tsx`, and that would have cost the thing the whole i18n
design rests on — `<html lang>` being the rendered locale rather than a constant.
Public URLs did not change.

Inside the console group, sign-in sits _outside_ the guard: `(console)` holds the
layout that redirects, so `/admin/sign-in` and `/admin/auth/*` have to live
beside it rather than under it, or the page you are redirected to would redirect you.

A six-digit code was built first and reverted: Supabase only allows the email template
to be edited once a custom SMTP sender is configured, and the stock template sends a
link with no `{{ .Token }}` in it. The code path can come back the day SMTP does — it
is the better flow, because it keeps the whole exchange on one screen and leaves no
window in which the browser holds a session the server cannot see.

Requesting the link is a server action, so the PKCE verifier cookie is written by the
server client and the callback — also server-side — can read it. `emailRedirectTo` is
built from the request's own host rather than from `NEXT_PUBLIC_SITE_URL`, or a link
asked for on localhost opens the production console.

Two gates, asked separately. `exchangeCodeForSession` answers "is this a valid one-time
code"; `admins` answers "may this person use the console". A real session that is not in
`admins` is ended at the callback, because leaving it alive hands an anon-key session to
anyone who can receive mail. On every later request the guard asks the first question
again with `getUser()` — not `getSession()`, which only reads a cookie the browser
controls.

`signInWithOtp` runs with `shouldCreateUser: false`, and the form's response is the same
whether or not the address belongs to an administrator: an unknown address gets the same
"check your mail" and simply never receives anything. An unauthenticated form that says
"no such user" is an account enumeration endpoint.

Middleware now matches `/admin` as well. Not for the locale logic, which skips it, but
because the access token is short-lived and something has to refresh it on the way past
or the console signs itself out mid-edit.

## Choice fields carry their own options

`options_source` used to point only at one hard-coded source. It now also accepts
`'list'`, meaning the options are written by hand — and because the form is
translated, they are written per language, on `order_field_translations.options`
(migration `0002`).

The languages are matched **by position**, and the value recorded in an order is the
option as it reads in the default locale. That is what keeps an answer readable after
someone retranslates the list, and it is why the console refuses to save lists of
different lengths: position is the only thing tying the languages together, and a
mismatch there would silently record the wrong answer rather than fail.

## Console access

`/admin/team` lists who may use the console, invites by email, and revokes.

Inviting is two clients, and the split is the point. The **caller's** client answers
"may you do this" — `is_admin()`, under RLS, as them. Only then does the service-role
client carry it out, because creating an auth user is not something a policy can grant:
there is no row to write and no session that owns it. The privileged client never
decides anything; it only performs what has already been allowed.

An address that already has an account is not a failure: the invitation is refused,
the `admins` row is written anyway — the row is what grants access — and the person
signs in the ordinary way.

Revoking deletes the `admins` row, not the `auth.users` record: the row is what grants
access, and leaving the account intact leaves anything attributed to it intact too.
Revoking yourself has no button at all rather than a disabled one, because there is no
state in which locking yourself out of the console is the thing you meant.

Invitations go through the same Supabase email sender as sign-in, so until custom SMTP
is configured they only reach addresses in the project's team.

## Demo mode

`NEXT_PUBLIC_CONSOLE_DEMO=1` fills the console with fixtures from
`src/lib/admin/demo.ts`, signs nobody in, and saves nothing. It exists so the console
can be shown before the data behind it is there.

It refuses to switch on when `NODE_ENV === "production"`. The flag disables the
sign-in guard, so a forgotten line in a deploy would otherwise publish an open
console — that is not a risk worth carrying for a convenience.

The fixtures are chosen to put every state on screen at least once: a published
product and a draft, one with a borrowed photograph and one whose price is a stand-in,
a retired form field among the live ones, and an order in each of the four statuses. A
demo in which everything is in its happy state demonstrates nothing. Photographs point
at the files already in `public/products`, so nothing about the demo depends on storage
being configured, and the upload control previews the chosen file locally instead of
writing to a bucket that may not exist.

Every save in demo mode answers "Demo mode: nothing was saved" rather than silently
doing nothing, so a click during a presentation does not look like a bug.

## The console on a phone

The bar carries a logo, four links and an account, and it was clamped to `h-header` —
so on a phone it wrapped to three lines inside a 72px box and printed itself over the
demo banner underneath. It is a floor now (`min-h-header`), the links sit on their own
row and scroll horizontally rather than wrapping, and the account stays beside the
logo.

One Tailwind detail worth remembering: `flex-1` sets a zero flex-basis, so it has to be
`sm:flex-1` — at base it silently defeated the `w-full` that puts the links on their
own line. Every console route measures zero horizontal overflow at 390px.

## Still open

- Wiring the public catalogue to these tables (the fixture is still what renders).
- The console itself: sign-in, product CRUD, photo upload, the form-field editor, the
  order list.
- The submission function and the Telegram notification.

---

# Phase 5 — the site reads the database, and orders come back

Everything above described a console with a database behind it and a site that still
read a fixture. This is the seam being closed, in three moves.

## 1. The catalogue

`lib/catalog/source.ts` is the one function the fixture's own comment promised. It
returns `Product[]`; every section takes that as a prop, so nothing below the page
knows or cares where the products came from.

- **No Supabase configured → the fixture.** That is what keeps a fresh clone running
  and the design reviewable with no database behind it.
- **Supabase configured → the database, even when it is empty.** An empty catalogue is
  a true statement about a shop that has not added anything yet. Showing eighteen
  fixture desserts instead would be a lie told at the worst possible moment — right
  after the owner wondered why their import did not appear.
- **A failed read throws.** A catalogue that could not load is not a catalogue with
  nothing in it, and the two must not render the same.

The order form resolves the same way (`lib/order/public-fields.ts`), with one
difference: an _empty_ field set falls back to the shipped seven. An empty catalogue is
a fact about the shop; an empty form is a configuration accident that would leave the
shop unreachable.

Photographs follow the path in the row: one starting with `/` is a file in `public`
(that is what the seed writes), anything else is an object in the `product-photos`
bucket. `NEXT_PUBLIC_CATALOG_DEMO_PHOTOS` still overrides both.

### Why the landing page is not pre-generated

`generateStaticParams` returns nothing on purpose. Pre-generating the three locales
would make every deploy render the catalogue at build time: a build would start failing
whenever Supabase blinked, and a build made before the first import would ship that
emptiness as a static file. The pages render on first request and are cached for 60
seconds (`revalidate`), and the console calls `revalidatePath("/[locale]", "page")`
whenever it saves — so an edit is visible immediately rather than within a minute.

## 2. Submission

`submit_order(p_locale, p_items, p_answers)` — `security definer`, granted to `anon`,
and the only way a row reaches `orders`.

What crosses the wire is what the browser is entitled to know: slug, variant, quantity,
and the answers typed into the form. Every dinar is recomputed from `products`; the
piece price and the whole-cake price are read there, a `whole` line on a product that
does not offer one is refused, and unpublished products do not exist as far as the
function is concerned. Names and labels are snapshotted at that moment, in the language
the customer was reading.

Required fields are checked against `order_fields` as it stands right now, not against
a list the page was built with, and failures come back as codes (`order_empty`,
`order_missing_field:<key>`) rather than sentences — the database does not speak three
languages and should not try.

What is deliberately not here: a rate limit, and the Telegram notification.
`orders.notified_at` is the column the notifier will set.

## 3. Weight and the declaration

`weight_g`, `kcal`, `protein_g`, `fat_g`, `carbs_g` on `products`, nullable, with the
console asking for all four macros or none. The detail panel shows the block only when
it is whole: a declaration with a gap in it is not a shorter declaration, it is a wrong
one. The figures in the fixture remain mocked until the kitchen measures.

## The spreadsheet import

`/admin/products/import`, and `public/import-template.xlsx` next to it.

A shop's catalogue already exists in a spreadsheet — typing eighteen products into a
form to get started is the kind of work that makes an owner decide the console is not
worth using. So the first load is a file, and re-importing a corrected file updates
what is there rather than doubling it, because rows are matched by slug.

**No new dependency.** An .xlsx is a zip of XML; `node:zlib` inflates the entries and
`lib/import/xlsx.ts` reads the central directory, the shared-string table and the first
worksheet — about two hundred lines against a library that would ship into every build
for the sake of one screen used once. CSV and TSV go through the same entry point,
with the delimiter detected (Excel writes semicolons on a machine whose decimal
separator is a comma, which is what a Serbian Windows hands over). The old binary .xls
is refused with the one instruction that fixes it.

Forgiving about how a person writes, strict about what lands in the table:

- Headings match however they are typed — case, spacing and punctuation ignored — and
  in all three languages (`cena`, `цена`, `price_rsd`; `naziv_sr`, `название_ru`).
- `1 250`, `1.250`, `1,250` and `1250 RSD` are all 1250. A lone separator with exactly
  three digits behind it is a thousands separator; otherwise the last separator is the
  decimal one, which is the rule Excel itself exports by.
- Storage words match by meaning: `frizider`, `заморожено`, `sobna temperatura`.
- A missing slug is made from the default-language name, transliterating Cyrillic — so
  "Медовик" and "Medovik" cannot become two products.
- `published` takes yes/no/da/ne/да/нет; empty means yes.

Nothing is written unless every row reads cleanly. A half-imported price list is worse
than a refused one: the owner cannot tell which half, and the fix would be to work out
what already exists. Errors come back with the row number the person sees in their own
spreadsheet.

---

# Phase 6 — Telegram

`submit_order` commits the row and answers the customer; a database webhook wakes
the `notify-order` Edge Function, which reprints the order into the staff group and
writes back `telegram_message_id` — which is also the flag that stops a second
webhook sending a second copy. A `pg_cron` sweep every two minutes picks up
anything the webhook did not manage, backing off by attempt count and giving up
after ten, at which point the order stays visible in
`public.orders_awaiting_notification`.

The token is an Edge Function secret and appears nowhere else. The chat id is a
row in `settings`, because Telegram reissues it when a group becomes a supergroup —
the function catches that, writes the new id and re-sends.

Setup, testing and the "it did not arrive" checklist: `docs/telegram-setup.md`.

---

# Phase 7 — statuses in the chat, push, WebP, and a real test run

**Statuses** are `new / processing / completed / canceled` (0009 renamed them in
place). A change in the console edits the order's Telegram message rather than
posting a new one; `telegram_status` records what the message shows and the sweep
closes any gap for a day. `docs/telegram-setup.md` §7.

**Push** (0010): Web Push to each administrator's own devices, sent once per new
order from `notify-order`, independent of Telegram. Encryption and VAPID are
hand-written on WebCrypto (`push.ts`) and checked two ways: decrypted by a
browser-side implementation in `scripts/check-web-push.ts`, and — once, outside
the repository — by `http_ece`, the reference implementation behind the
`web-push` package (25/25). The console is installable (`admin.webmanifest`),
because an iPhone only delivers Web Push to Home Screen apps. `docs/push-setup.md`.

**Photos** become WebP on the server (`/admin/api/photo`), because Safari's canvas
silently answers a WebP request with a PNG. `sharp` is declared as a dependency
but adds nothing to the install: it is the encoder Next already ships for
`next/image`. The browser only shrinks very large photos first, to stay under
the platform's request-size limit.

**The import no longer wipes photos** on a re-import with an empty photo column —
a bulk upsert sends a missing key as null, so rows with and without a photo go in
separate batches.

**The template required the wrong name column.** The default locale is English
(code and database agree); the template marked `name_sr` required. Fixed, and the
generator is now in the repository (`scripts/build-import-template.py`).

**`npm run check:db`** runs every migration, the seed, and 47 behaviour checks on
a throwaway local Postgres, with Supabase's own pieces stubbed
(`scripts/db-test/`). What it cannot cover is PostgREST, Storage, Auth email and
the Edge runtime themselves.
