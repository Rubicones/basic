-- ─────────────────────────────────────────────────────────────────────────────
-- basic — initial schema
--
-- Localised content lives in side tables (`*_translations`), keyed by locale.
-- That was the choice made over localised columns and over one jsonb blob: a
-- fourth language is rows, not a migration and not a rewrite of every query.
--
-- What the side table cannot do is make "English always exists" a column
-- constraint, which localised columns get for free. So it is a trigger instead:
-- a row may be drafted in one language, but it cannot be *published* without a
-- translation in the default locale. See `assert_default_translation`.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

-- ── locales ──────────────────────────────────────────────────────────────────
-- A table rather than an enum, because adding a language must be an INSERT.

create table public.locales (
  code      text primary key check (code ~ '^[a-z]{2}(-[A-Za-z0-9]+)*$'),
  label     text not null,
  is_default boolean not null default false,
  position  integer not null default 0
);

-- Exactly one default: the fallback can never be ambiguous or absent.
create unique index locales_one_default on public.locales (is_default) where is_default;

insert into public.locales (code, label, is_default, position) values
  ('sr', 'Srpski',  false, 1),
  ('ru', 'Русский', false, 2),
  ('en', 'English', true,  3);

create or replace function public.default_locale() returns text
  language sql stable as $$
  select code from public.locales where is_default limit 1;
$$;

-- ── shared helpers ───────────────────────────────────────────────────────────

create or replace function public.touch_updated_at() returns trigger
  language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ── products ─────────────────────────────────────────────────────────────────

create type public.product_format as enum ('whole', 'frozen', 'chilled', 'ambient');

create table public.products (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- Dinars, whole units. Money is never a float.
  price_rsd            integer not null check (price_rsd >= 0),
  -- The owner has not set a real price yet; the site shows it as provisional.
  price_is_placeholder boolean not null default false,
  -- Whether the card offers the piece / whole-cake toggle.
  has_whole            boolean not null default false,
  whole_multiplier     smallint not null default 6 check (whole_multiplier > 0),
  formats              public.product_format[] not null default '{}',
  photo_path           text,
  -- Base64 preview, inlined into the markup so the card never flashes empty.
  photo_blur           text,
  photo_is_placeholder boolean not null default false,
  position             integer not null default 0,
  is_published         boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index products_published_position on public.products (position)
  where is_published;

create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

create table public.product_translations (
  product_id uuid not null references public.products (id) on delete cascade,
  locale     text not null references public.locales (code) on update cascade,
  name       text not null check (length(btrim(name)) > 0),
  note       text not null default '',
  primary key (product_id, locale)
);

-- ── order form configuration ─────────────────────────────────────────────────
-- The set of fields the owner edits in the console. The shape constraint is what
-- keeps a "select with rows: 3" or an "input with no type" out of the table.

create type public.order_field_control as enum ('input', 'select', 'textarea');
create type public.order_field_type    as enum ('text', 'tel', 'email', 'date');

create table public.order_fields (
  id             uuid primary key default gen_random_uuid(),
  key            text not null unique check (key ~ '^[a-z][a-z0-9_]*$'),
  control        public.order_field_control not null,
  input_type     public.order_field_type,
  -- Where a select's options come from; 'cities' is the only source today.
  options_source text,
  rows           smallint check (rows between 2 and 10),
  autocomplete   text,
  is_required    boolean not null default false,
  is_wide        boolean not null default false,
  is_enabled     boolean not null default true,
  position       integer not null default 0,
  constraint order_fields_shape check (
    (control = 'input'    and input_type is not null and rows is null     and options_source is null)
    or (control = 'select'   and input_type is null and rows is null     and options_source is not null)
    or (control = 'textarea' and input_type is null and rows is not null and options_source is null)
  )
);

create table public.order_field_translations (
  field_id    uuid not null references public.order_fields (id) on delete cascade,
  locale      text not null references public.locales (code) on update cascade,
  label       text not null check (length(btrim(label)) > 0),
  placeholder text not null default '',
  help        text not null default '',
  primary key (field_id, locale)
);

-- ── the default-locale invariant ─────────────────────────────────────────────
-- A draft may exist in one language. A *published* row may not: the fallback has
-- to resolve to something for every visitor, whatever their language.

create or replace function public.assert_default_translation() returns trigger
  language plpgsql as $$
declare
  target uuid;
  ok boolean;
begin
  if tg_table_name = 'products' then
    if not new.is_published then return new; end if;
    select exists (
      select 1 from public.product_translations t
      where t.product_id = new.id and t.locale = public.default_locale()
    ) into ok;
    if not ok then
      raise exception 'product % cannot be published without a % translation',
        new.slug, public.default_locale();
    end if;
    return new;
  end if;

  -- order_fields
  if not new.is_enabled then return new; end if;
  select exists (
    select 1 from public.order_field_translations t
    where t.field_id = new.id and t.locale = public.default_locale()
  ) into ok;
  if not ok then
    raise exception 'field % cannot be enabled without a % label',
      new.key, public.default_locale();
  end if;
  return new;
end;
$$;

create constraint trigger products_default_translation
  after insert or update of is_published on public.products
  deferrable initially deferred
  for each row execute function public.assert_default_translation();

create constraint trigger order_fields_default_translation
  after insert or update of is_enabled on public.order_fields
  deferrable initially deferred
  for each row execute function public.assert_default_translation();

-- Deleting the default translation out from under a published row is the same
-- violation from the other side.
create or replace function public.assert_default_translation_kept() returns trigger
  language plpgsql as $$
begin
  if old.locale <> public.default_locale() then return old; end if;

  if tg_table_name = 'product_translations'
     and exists (select 1 from public.products p
                 where p.id = old.product_id and p.is_published) then
    raise exception 'cannot remove the % translation of a published product', old.locale;
  end if;

  if tg_table_name = 'order_field_translations'
     and exists (select 1 from public.order_fields f
                 where f.id = old.field_id and f.is_enabled) then
    raise exception 'cannot remove the % label of an enabled field', old.locale;
  end if;

  return old;
end;
$$;

create trigger product_translations_keep_default
  before delete on public.product_translations
  for each row execute function public.assert_default_translation_kept();

create trigger order_field_translations_keep_default
  before delete on public.order_field_translations
  for each row execute function public.assert_default_translation_kept();

-- ── orders ───────────────────────────────────────────────────────────────────
-- Everything a customer saw is snapshotted. A later price edit or a relabelled
-- field must not silently rewrite an order that has already been placed.

create type public.order_status  as enum ('new', 'confirmed', 'done', 'cancelled');
create type public.order_variant as enum ('piece', 'whole');

create table public.orders (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  status        public.order_status not null default 'new',
  -- The language the order was placed in, so replies go back in it.
  locale        text not null references public.locales (code),
  total_rsd     integer not null check (total_rsd >= 0),
  notified_at   timestamptz
);

create index orders_recent on public.orders (created_at desc);

create table public.order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders (id) on delete cascade,
  -- Kept null rather than cascading: deleting a product must not delete history.
  product_id     uuid references public.products (id) on delete set null,
  variant        public.order_variant not null,
  qty            integer not null check (qty > 0),
  unit_price_rsd integer not null check (unit_price_rsd >= 0),
  name_snapshot  text not null
);

create index order_items_by_order on public.order_items (order_id);

create table public.order_answers (
  order_id       uuid not null references public.orders (id) on delete cascade,
  field_key      text not null,
  label_snapshot text not null,
  value          text not null,
  position       integer not null default 0,
  primary key (order_id, field_key)
);

-- ── admins ───────────────────────────────────────────────────────────────────
-- Sign-in is a magic link; this table is what turns a signed-in user into an
-- administrator. Revoking access is a delete, not a redeploy.

create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

-- ── row level security ───────────────────────────────────────────────────────

alter table public.locales                   enable row level security;
alter table public.products                  enable row level security;
alter table public.product_translations      enable row level security;
alter table public.order_fields              enable row level security;
alter table public.order_field_translations  enable row level security;
alter table public.orders                    enable row level security;
alter table public.order_items               enable row level security;
alter table public.order_answers             enable row level security;
alter table public.admins                    enable row level security;

create policy locales_read on public.locales for select using (true);

create policy products_read_published on public.products
  for select using (is_published);
create policy products_admin on public.products
  for all using (public.is_admin()) with check (public.is_admin());

create policy product_translations_read on public.product_translations
  for select using (exists (
    select 1 from public.products p where p.id = product_id and p.is_published
  ));
create policy product_translations_admin on public.product_translations
  for all using (public.is_admin()) with check (public.is_admin());

create policy order_fields_read on public.order_fields
  for select using (is_enabled);
create policy order_fields_admin on public.order_fields
  for all using (public.is_admin()) with check (public.is_admin());

create policy order_field_translations_read on public.order_field_translations
  for select using (exists (
    select 1 from public.order_fields f where f.id = field_id and f.is_enabled
  ));
create policy order_field_translations_admin on public.order_field_translations
  for all using (public.is_admin()) with check (public.is_admin());

-- No anon policy on orders, deliberately. A public INSERT would let anyone post
-- their own `total_rsd`, and a cart the client prices is a cart the client can
-- discount. Submission will land as a security-definer function that recomputes
-- every line from `products` and writes the order itself.
create policy orders_admin on public.orders
  for all using (public.is_admin()) with check (public.is_admin());
create policy order_items_admin on public.order_items
  for all using (public.is_admin()) with check (public.is_admin());
create policy order_answers_admin on public.order_answers
  for all using (public.is_admin()) with check (public.is_admin());

-- An administrator may see the roster; only the service role may change it.
create policy admins_read on public.admins
  for select using (public.is_admin());

-- ── storage ──────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
  values ('product-photos', 'product-photos', true)
  on conflict (id) do nothing;

create policy product_photos_read on storage.objects
  for select using (bucket_id = 'product-photos');
create policy product_photos_admin on storage.objects
  for all using (bucket_id = 'product-photos' and public.is_admin())
  with check (bucket_id = 'product-photos' and public.is_admin());
