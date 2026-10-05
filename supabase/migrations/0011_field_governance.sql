-- ════ 0011 — order form governance ══════════════════════════════════════════
--
-- The privacy policy now promises what the order form may contain. This makes
-- the database keep that promise rather than the console's good manners:
--
--   · every field states its purpose, per language (shown in Annex 1)
--   · a field is `normal` or `special_category`; special ones are never required
--   · every change to the field set is written to an audit table
--   · answers typed into the form are cleared after the retention period
--
-- The "no card / IBAN / ID number fields" rule lives in the console
-- (src/lib/order/governance.ts) — it is a keyword match, and keywords in three
-- languages are easier to keep in one TypeScript constant than in SQL.

-- ── purpose and sensitivity ─────────────────────────────────────────────────

create type public.order_field_sensitivity as enum ('normal', 'special_category');

alter table public.order_fields
  add column sensitivity public.order_field_sensitivity not null default 'normal',
  add constraint order_fields_special_optional
    check (sensitivity = 'normal' or not is_required);

alter table public.order_field_translations
  add column purpose text not null default '';

-- An enabled field must say why it is asked, at least in the default language.
create or replace function public.assert_field_purpose() returns trigger
  language plpgsql as $$
declare
  v_field uuid;
begin
  -- Branch before touching columns: a record only has its own table's fields.
  if tg_table_name = 'order_fields' then
    if not new.is_enabled then
      return null;
    end if;
    v_field := new.id;
  else
    v_field := new.field_id;
  end if;
  if exists (select 1 from public.order_fields f where f.id = v_field and f.is_enabled)
     and not exists (
       select 1 from public.order_field_translations t
        where t.field_id = v_field
          and t.locale = public.default_locale()
          and length(btrim(t.purpose)) > 0
     ) then
    raise exception 'order_field_needs_purpose' using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

-- The shipped fields, so the constraint triggers below hold from the start.
update public.order_field_translations t
   set purpose = p.purpose
  from public.order_fields f,
       (values
         ('venue', 'en', 'Identify the venue placing the order and address the invoice.'),
         ('venue', 'ru', 'Определить заведение, от имени которого сделан заказ, и выставить счёт.'),
         ('venue', 'sr', 'Identifikacija lokala koji poručuje i izdavanje računa.'),
         ('contact', 'en', 'Know whom to speak to about the order.'),
         ('contact', 'ru', 'Знать, с кем связаться по заказу.'),
         ('contact', 'sr', 'Da znamo s kim da razgovaramo o porudžbini.'),
         ('phone', 'en', 'Confirm the order and arrange delivery.'),
         ('phone', 'ru', 'Подтвердить заказ и согласовать доставку.'),
         ('phone', 'sr', 'Potvrda porudžbine i dogovor o dostavi.'),
         ('email', 'en', 'Send the invoice or order information by e-mail, if you want it.'),
         ('email', 'ru', 'Отправить счёт или информацию о заказе по почте, если вы этого хотите.'),
         ('email', 'sr', 'Slanje računa ili informacija o porudžbini e-poštom, ako to želite.'),
         ('city', 'en', 'Plan the delivery and apply the terms for your city.'),
         ('city', 'ru', 'Спланировать доставку и применить условия для вашего города.'),
         ('city', 'sr', 'Planiranje dostave i primena uslova za vaš grad.'),
         ('date', 'en', 'Schedule production and delivery.'),
         ('date', 'ru', 'Запланировать приготовление и доставку.'),
         ('date', 'sr', 'Planiranje pripreme i dostave.'),
         ('comment', 'en', 'Take delivery, packing and kitchen notes into account.'),
         ('comment', 'ru', 'Учесть пожелания по доставке, упаковке и для кухни.'),
         ('comment', 'sr', 'Uvažavanje napomena o dostavi, pakovanju i za kuhinju.')
       ) as p(key, locale, purpose)
 where f.id = t.field_id and f.key = p.key and t.locale = p.locale;

-- Fields added by hand before this migration get a stand-in, so enabling the
-- trigger cannot fail; the console shows it and the owner replaces it.
update public.order_field_translations
   set purpose = 'Processing your order request.'
 where purpose = '' and locale = public.default_locale();

create constraint trigger order_fields_purpose
  after insert or update of is_enabled on public.order_fields
  deferrable initially deferred
  for each row execute function public.assert_field_purpose();

create constraint trigger order_field_translations_purpose
  after insert or update of purpose on public.order_field_translations
  deferrable initially deferred
  for each row execute function public.assert_field_purpose();

-- ── audit ───────────────────────────────────────────────────────────────────

create table public.order_field_audit (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  actor      uuid default auth.uid(),
  actor_email text,
  table_name text not null,
  action     text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  field_id   uuid,
  before     jsonb,
  after      jsonb
);

create index order_field_audit_recent on public.order_field_audit (at desc);

alter table public.order_field_audit enable row level security;
-- Read by administrators; written only by the trigger below, never by a client.
create policy order_field_audit_read on public.order_field_audit
  for select using (public.is_admin());

create or replace function public.audit_order_fields() returns trigger
  language plpgsql security definer set search_path = public as $$
declare
  v_before jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  v_after  jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
begin
  -- A save that changes nothing is not a change to the field set.
  if tg_op = 'UPDATE' and v_before = v_after then
    return null;
  end if;
  insert into public.order_field_audit (actor, actor_email, table_name, action, field_id, before, after)
  values (
    auth.uid(),
    (select email from auth.users where id = auth.uid()),
    tg_table_name,
    tg_op,
    coalesce(v_after ->> 'field_id', v_after ->> 'id', v_before ->> 'field_id', v_before ->> 'id')::uuid,
    v_before,
    v_after
  );
  return null;
end;
$$;

create trigger order_fields_audit
  after insert or update or delete on public.order_fields
  for each row execute function public.audit_order_fields();

create trigger order_field_translations_audit
  after insert or update or delete on public.order_field_translations
  for each row execute function public.audit_order_fields();

-- When the published field set last changed — the "as of" date of Annex 1.
-- Public, and it reveals a date and nothing else.
create or replace function public.order_form_changed_at() returns timestamptz
  language sql stable security definer set search_path = public as $$
  select max(at) from public.order_field_audit;
$$;
revoke all on function public.order_form_changed_at() from public;
grant execute on function public.order_form_changed_at() to anon, authenticated;

-- ── retention ───────────────────────────────────────────────────────────────

-- THE retention period. One place; the policy text and docs/privacy-cookies.md
-- refer to it.
create or replace function public.order_answers_retention() returns interval
  language sql immutable as $$ select interval '24 months' $$;

-- Answers kept past the period because they are invoice data — the venue is who
-- the invoice was made out to. Everything else typed into the form goes.
create or replace function public.order_answers_kept_for_invoices() returns text[]
  language sql immutable as $$ select array['venue']::text[] $$;

alter table public.orders add column answers_cleared_at timestamptz;

create or replace function public.purge_old_order_answers() returns integer
  language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
begin
  with old as (
    select id from public.orders
     where created_at < now() - public.order_answers_retention()
       and answers_cleared_at is null
  ), gone as (
    delete from public.order_answers a
     using old
     where a.order_id = old.id
       and a.field_key <> all (public.order_answers_kept_for_invoices())
    returning 1
  )
  select count(*) into v_count from gone;

  -- Items, totals and the kept answers stay; the order is marked so the next run
  -- skips it.
  update public.orders set answers_cleared_at = now()
   where created_at < now() - public.order_answers_retention()
     and answers_cleared_at is null;

  return v_count;
end;
$$;
revoke all on function public.purge_old_order_answers() from public;

-- Daily, at a quiet hour (UTC).
select cron.schedule('purge-old-order-answers', '17 3 * * *', 'select public.purge_old_order_answers()');
