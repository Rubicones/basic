-- ── telling the kitchen an order arrived ─────────────────────────────────────
--
-- The customer is told their request has been sent the moment the row commits.
-- Telling Telegram is a different problem with a different failure mode, so it
-- happens after the fact, from a database webhook, and is retried until it works
-- or until it is loud about not working.
--
-- Everything the retry needs lives in the row: how many times it has been tried,
-- when it was last tried, what went wrong, and — the important one — the Telegram
-- message id, which is also the "already sent" flag. Webhooks fire more than
-- once; two identical orders in a shared staff chat is worse than one arriving a
-- minute late.

-- ── settings ─────────────────────────────────────────────────────────────────
-- Values that have to change without a deploy. The chat id is the reason this
-- table exists: Telegram issues a group a *new* id the moment it is upgraded to
-- a supergroup, which happens by itself, and an env var would mean a redeploy in
-- the middle of an afternoon when orders are arriving.

create table public.settings (
  key        text primary key,
  value      jsonb,
  note       text not null default '',
  updated_at timestamptz not null default now()
);

create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();

alter table public.settings enable row level security;

-- No anon policy at all: the chat id is not a secret, but nothing on the public
-- site has any business reading configuration. The notifier reaches this with
-- the service role, which RLS does not apply to.
create policy settings_admin on public.settings
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.settings (key, value, note) values
  ('telegram_chat_id', null,
   'The group the notifier posts into, as a JSON number: -1001234567890. Get it by ' ||
   'adding the bot to the group and reading getUpdates — docs/telegram-setup.md has ' ||
   'the steps. The notifier rewrites this by itself if the group is upgraded to a ' ||
   'supergroup and Telegram hands back a new id.'),
  ('shop_timezone', '"Europe/Belgrade"',
   'The zone order times are written in. Staff read these at a counter in Belgrade, ' ||
   'not in UTC.'),
  ('notify_endpoint', null,
   'The notify-order function, as a JSON string: ' ||
   '"https://<project>.supabase.co/functions/v1/notify-order". Only the retry sweep ' ||
   'uses it — the webhook has its own copy of the URL. Left null, the sweep does ' ||
   'nothing and says so.')
on conflict (key) do nothing;

-- ── what an order remembers about being announced ────────────────────────────

alter table public.orders
  -- Something a person can say out loud. A uuid is not a number you read down
  -- the phone to a café that called to change their order.
  add column number              integer generated always as identity,
  add column notify_attempts     integer not null default 0,
  add column notify_attempted_at timestamptz,
  add column notify_error        text,
  -- Set exactly once, by whichever delivery wins. Its presence is what makes a
  -- second webhook a no-op.
  add column telegram_message_id bigint;

create unique index orders_number on public.orders (number);

-- The sweep's whole query: the orders that have not been announced. Partial, so
-- it stays the size of the backlog rather than the size of the history.
create index orders_unannounced on public.orders (created_at)
  where notified_at is null;

/**
 * Claiming an order for delivery.
 *
 * Two webhook deliveries can arrive at the same instant, and a read-then-check
 * would let both of them decide the message had not been sent yet. This is one
 * statement: the row is claimed and counted in the same update, and a claim that
 * comes back empty means someone else already has it — or it is already sent.
 *
 * The attempt is counted here, at the start, rather than on failure. A function
 * that dies mid-flight still has to be seen to have tried, or the sweep will
 * spin on it forever.
 */
create or replace function public.claim_order_notification(p_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
begin
  update public.orders
     set notify_attempts     = notify_attempts + 1,
         notify_attempted_at = now()
   where id = p_id
     and telegram_message_id is null
  returning * into v_order;

  return v_order;
end;
$$;

revoke all on function public.claim_order_notification(uuid) from public;
grant execute on function public.claim_order_notification(uuid) to service_role;

/**
 * The other end of a delivery.
 *
 * Success and failure are one function so the notifier cannot write half of
 * either: an order is never left holding a message id with no timestamp, or an
 * error that a later success forgot to clear.
 */
create or replace function public.record_order_notification(
  p_id         uuid,
  p_message_id bigint,
  p_error      text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_message_id is not null then
    update public.orders
       set telegram_message_id = p_message_id,
           notified_at         = now(),
           notify_error        = null
     where id = p_id;
  else
    update public.orders
       set notify_error = left(coalesce(p_error, 'unknown'), 500)
     where id = p_id;
  end if;
end;
$$;

revoke all on function public.record_order_notification(uuid, bigint, text) from public;
grant execute on function public.record_order_notification(uuid, bigint, text) to service_role;

-- ── the ones that got stuck ──────────────────────────────────────────────────
-- Orders past the attempt limit stop being retried, which is not the same as
-- being fine. This is where to look; docs/telegram-setup.md says so too.

create or replace view public.orders_awaiting_notification
with (security_invoker = true) as
  select o.number,
         o.id,
         o.created_at,
         o.locale,
         o.total_rsd,
         o.notify_attempts,
         o.notify_attempted_at,
         o.notify_error,
         o.notify_attempts >= 10 as gave_up
    from public.orders o
   where o.notified_at is null
   order by o.created_at;
