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
express that, so it is enforced instead as an invariant on *publishing*:

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

| table | anon | admin |
| --- | --- | --- |
| `locales` | read | read |
| `products`, `product_translations` | read **when published** | everything |
| `order_fields`, `order_field_translations` | read **when enabled** | everything |
| `orders`, `order_items`, `order_answers` | nothing | everything |
| `admins` | nothing | read |
| `storage: product-photos` | read | everything |

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

Inside the console group, sign-in sits *outside* the guard: `(console)` holds the
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

## Still open

- Wiring the public catalogue to these tables (the fixture is still what renders).
- The console itself: sign-in, product CRUD, photo upload, the form-field editor, the
  order list.
- The submission function and the Telegram notification.
