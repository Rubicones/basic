-- ── what a card has to be able to say, and how an order gets made ────────────
--
-- Two things, in one migration because they are the same move: the site stops
-- reading a fixture and starts reading this database, and for that it needs both
-- the figures the detail panel shows and a way to send an order back.

-- ── weight and the declaration ───────────────────────────────────────────────
-- Per piece for a piece, per cake for a cake. Macros are per 100g, which is how a
-- declaration states them, and they are nullable: a product with nothing measured
-- yet shows no panel rather than a panel of zeroes.

alter table public.products
  add column weight_g  integer check (weight_g > 0),
  add column kcal      integer check (kcal >= 0),
  add column protein_g numeric(5, 1) check (protein_g >= 0),
  add column fat_g     numeric(5, 1) check (fat_g >= 0),
  add column carbs_g   numeric(5, 1) check (carbs_g >= 0);

-- ── submission ───────────────────────────────────────────────────────────────
--
-- The policy comment in 0001 promised this function, and the promise is the
-- design: there is no anon INSERT on `orders`, so the only way an order comes
-- into being is here, where the server prices it.
--
-- What the client sends is what the client is allowed to know: which product,
-- which variant, how many, and the answers typed into the form. Every dinar is
-- recomputed from `products` — a cart the client prices is a cart the client can
-- discount — and every name and label is snapshotted at this moment, so a later
-- edit in the console cannot rewrite an order that has already been placed.
--
-- Failures are raised with machine-readable codes rather than sentences: the site
-- speaks three languages and the database should not have to.

create or replace function public.submit_order(
  p_locale  text,
  p_items   jsonb,
  p_answers jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_locale   text;
  v_order_id uuid;
  v_total    integer := 0;
  v_item     jsonb;
  v_slug     text;
  v_variant  public.order_variant;
  v_qty      integer;
  v_product  public.products%rowtype;
  v_price    integer;
  v_name     text;
  v_field    record;
  v_value    text;
  v_label    text;
  v_count    integer := 0;
begin
  select code into v_locale from public.locales where code = p_locale;
  if v_locale is null then
    v_locale := public.default_locale();
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'order_empty' using errcode = 'check_violation';
  end if;
  if jsonb_array_length(p_items) > 60 then
    raise exception 'order_too_large' using errcode = 'check_violation';
  end if;

  insert into public.orders (locale, total_rsd) values (v_locale, 0)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_slug := v_item ->> 'slug';
    v_qty  := coalesce((v_item ->> 'qty')::integer, 0);

    if (v_item ->> 'variant') not in ('piece', 'whole') then
      raise exception 'order_bad_variant' using errcode = 'check_violation';
    end if;
    v_variant := (v_item ->> 'variant')::public.order_variant;

    if v_qty < 1 or v_qty > 999 then
      raise exception 'order_bad_quantity' using errcode = 'check_violation';
    end if;

    select * into v_product from public.products
     where slug = v_slug and is_published;
    if not found then
      raise exception 'order_unknown_product:%', v_slug using errcode = 'check_violation';
    end if;

    if v_variant = 'whole' then
      if not v_product.has_whole or v_product.whole_price_rsd is null then
        raise exception 'order_unknown_product:%', v_slug using errcode = 'check_violation';
      end if;
      v_price := v_product.whole_price_rsd;
    else
      v_price := v_product.price_rsd;
    end if;

    -- The name the customer was looking at, in the language they were reading,
    -- falling back exactly the way the site falls back.
    select t.name into v_name from public.product_translations t
     where t.product_id = v_product.id and t.locale = v_locale;
    if v_name is null then
      select t.name into v_name from public.product_translations t
       where t.product_id = v_product.id and t.locale = public.default_locale();
    end if;

    insert into public.order_items
      (order_id, product_id, variant, qty, unit_price_rsd, name_snapshot)
    values
      (v_order_id, v_product.id, v_variant, v_qty, v_price, coalesce(v_name, v_product.slug));

    v_total := v_total + v_price * v_qty;
  end loop;

  -- The form is whatever the console says it is right now: the enabled fields are
  -- the ones asked for, and a required one that came back empty is the reason an
  -- order does not exist rather than something noticed later in a chat.
  for v_field in
    select f.id, f.key, f.is_required, f.position
      from public.order_fields f
     where f.is_enabled
     order by f.position
  loop
    v_value := btrim(coalesce(p_answers ->> v_field.key, ''));

    if v_field.is_required and v_value = '' then
      raise exception 'order_missing_field:%', v_field.key using errcode = 'check_violation';
    end if;
    continue when v_value = '';

    if length(v_value) > 1000 then
      v_value := left(v_value, 1000);
    end if;

    select t.label into v_label from public.order_field_translations t
     where t.field_id = v_field.id and t.locale = v_locale;
    if v_label is null then
      select t.label into v_label from public.order_field_translations t
       where t.field_id = v_field.id and t.locale = public.default_locale();
    end if;

    insert into public.order_answers (order_id, field_key, label_snapshot, value, position)
    values (v_order_id, v_field.key, coalesce(v_label, v_field.key), v_value, v_field.position);

    v_count := v_count + 1;
  end loop;

  update public.orders set total_rsd = v_total where id = v_order_id;

  return v_order_id;
end;
$$;

-- `public` includes every future role; the two that place orders are named.
revoke all on function public.submit_order(text, jsonb, jsonb) from public;
grant execute on function public.submit_order(text, jsonb, jsonb) to anon, authenticated;
