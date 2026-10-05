# Privacy policy, order-form governance, cookie consent

## Order form ↔ policy

- Policy §2 promises categories, not fields; **Annex 1** on `/[locale]/privacy-policy` is rendered live from `order_fields` (label, mandatory, purpose; special-category fields listed separately). Its date is the last change in `order_field_audit`.
- Every field needs a purpose in the default language (DB trigger, migration 0011). `special_category` fields can't be required (DB check) and show the consent note on the form.
- Fields mentioning cards, IBAN/bank accounts or ID numbers are refused on save: `FORBIDDEN_FIELD_KEYWORDS` in `src/lib/order/governance.ts`.
- All inserts/updates/deletes on `order_fields` / `order_field_translations` are logged in `order_field_audit` (actor, time, before, after).

## Retention

- `public.order_answers_retention()` = **24 months** — the single constant. Daily cron `purge-old-order-answers` (03:17 UTC) deletes form answers older than that, except keys in `order_answers_kept_for_invoices()` (`venue`). Items and totals are untouched.

## Cookies

- Data: `src/lib/consent/config.ts` (categories, cookie list, versions). Change the list → `CONSENT_SCHEMA` changes → everyone is asked again. Change wording → bump `CONSENT_UI_VERSION`; change policy → bump `CONSENT_POLICY_VERSION`.
- Only GA4 is gated. `gtag.js` is not requested until analytics is accepted (no Consent Mode). Withdrawal sets `ga-disable-<id>` and deletes `_ga`, `_ga_*`.
- Decision = cookie `basic_consent` (12 months) + anonymous row in `consent_records` (migration 0012, insert-only for the public).
- Banner is server-rendered and hidden before paint by the inline script (`src/lib/consent/prepaint.ts`) when a current decision exists.

## Setup

1. Apply migrations 0011 and 0012 (or rerun `supabase/restore/01-restore.sql`, regenerated).
2. Vercel env: `NEXT_PUBLIC_GA_ID=G-XXXXXXX`. Without it the Analytics category is shown but nothing loads.
3. GA4 admin: Data collection → **Google signals off**; Data retention → **2 months**; no user-ID, no custom dimensions with personal data. Events carry `order_id` only.
4. Cookie Policy page: `/[locale]/cookie-policy`, generated from the same cookie list.
