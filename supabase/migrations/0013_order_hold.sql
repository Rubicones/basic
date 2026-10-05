-- ════ 0013 — a minute to change your mind ═══════════════════════════════════
--
-- A submitted order is written at once, then held for 60 seconds. In that
-- minute the customer can take it back ("made a mistake? fix it") with the
-- token only they were given; after it, it is released to the shop — Telegram,
-- push — by pg_cron, so it does not matter whether the tab is still open.
--
-- Nothing about `submit_order` changes: the hold is two column defaults, and
-- the release is a job. The notifiers learn one rule — a held order is not
-- theirs yet.

alter table public.orders
  add column release_at   timestamptz default now() + interval '60 seconds',
  add column released_at  timestamptz,
  add column cancel_token uuid default gen_random_uuid();

-- Everything already in the table was never held.
update public.orders set release_at = created_at, released_at = created_at, cancel_token = null;

create index orders_held on public.orders (release_at) where released_at is null;

/** Is this order still in its minute? */
create or replace function public.order_is_held(p_order public.orders) returns boolean
  language sql stable as $$
  select p_order.released_at is null and p_order.release_at > now()
$$;

-- ── submission, with the token ──────────────────────────────────────────────

create or replace function public.submit_order_held(
  p_locale  text,
  p_items   jsonb,
  p_answers jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := public.submit_order(p_locale, p_items, p_answers);
  v_order public.orders;
begin
  select * into v_order from public.orders where id = v_id;
  return jsonb_build_object(
    'id', v_order.id,
    'token', v_order.cancel_token,
    'release_at', v_order.release_at
  );
end;
$$;
revoke all on function public.submit_order_held(text, jsonb, jsonb) from public;
grant execute on function public.submit_order_held(text, jsonb, jsonb) to anon, authenticated;

-- ── taking it back ──────────────────────────────────────────────────────────

-- Deleted, not marked cancelled: the shop never saw it, so there is nothing for
-- the console to show. Only within the minute, only with the token.
create or replace function public.cancel_held_order(p_id uuid, p_token uuid) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gone uuid;
begin
  delete from public.orders
   where id = p_id
     and cancel_token = p_token
     and released_at is null
     and release_at > now()
  returning id into v_gone;
  return v_gone is not null;
end;
$$;
revoke all on function public.cancel_held_order(uuid, uuid) from public;
grant execute on function public.cancel_held_order(uuid, uuid) to anon, authenticated;

-- ── notifying: one sender, and no sending while held ────────────────────────

create or replace function public.post_order_inserted(p_id uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_endpoint text;
  v_secret   text;
begin
  select value #>> '{}' into v_endpoint from public.settings where key = 'notify_endpoint';
  select decrypted_secret into v_secret
    from vault.decrypted_secrets
   where name = 'notify_webhook_secret';

  if v_endpoint is null or v_endpoint = '' or v_secret is null then
    raise log 'post_order_inserted: endpoint or secret not configured, order % left for the sweep', p_id;
    return;
  end if;

  perform net.http_post(
    url     := v_endpoint,
    headers := jsonb_build_object('content-type', 'application/json', 'x-notify-secret', v_secret),
    body    := jsonb_build_object('type', 'INSERT', 'table', 'orders',
                                  'record', jsonb_build_object('id', p_id)),
    timeout_milliseconds := 5000
  );
exception
  when others then
    raise log 'post_order_inserted: % (order %), left for the sweep', sqlerrm, p_id;
end;
$$;
revoke all on function public.post_order_inserted(uuid) from public;

-- The insert trigger: a held order waits for the release job instead.
create or replace function public.notify_order_inserted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.order_is_held(new) then
    perform public.post_order_inserted(new.id);
  end if;
  return new;
end;
$$;

-- The notifiers claim before they send; a held order cannot be claimed, so the
-- 2-minute sweep cannot leak one early either.
create or replace function public.claim_order_notification(p_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
begin
  update public.orders o
     set notify_attempts     = notify_attempts + 1,
         notify_attempted_at = now()
   where o.id = p_id
     and o.telegram_message_id is null
     and not public.order_is_held(o)
  returning * into v_order;

  return v_order;
end;
$$;

create or replace function public.claim_order_push(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claimed uuid;
begin
  update public.orders o
     set push_sent_at = now()
   where o.id = p_id
     and o.push_sent_at is null
     and not public.order_is_held(o)
  returning id into v_claimed;

  return v_claimed is not null;
end;
$$;

-- ── release ─────────────────────────────────────────────────────────────────

create or replace function public.release_held_orders() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id    uuid;
  v_count integer := 0;
begin
  for v_id in
    update public.orders
       set released_at = now(),
           cancel_token = null
     where released_at is null
       and release_at <= now()
    returning id
  loop
    perform public.post_order_inserted(v_id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.release_held_orders() from public;

-- Every 10 seconds: an order reaches the shop 60–70 s after it was sent.
select cron.schedule('release-held-orders', '10 seconds', 'select public.release_held_orders()');
