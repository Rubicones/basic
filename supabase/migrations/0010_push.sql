-- ── push notifications to the people running the console ─────────────────────
--
-- Telegram is the shared room. Push is the phone in someone's pocket: the same
-- new order, on the lock screen of each administrator who asked for it, whether
-- or not the group chat is muted.
--
-- A subscription is a browser's promise to wake up for us: an endpoint on the
-- browser vendor's push service, and two keys only that browser can use to read
-- what we send. One row per device, owned by the administrator who enabled it.

create table public.push_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  -- Unique: the same browser subscribing twice is the same subscription.
  endpoint        text not null unique,
  p256dh          text not null,
  auth            text not null,
  -- "Safari on iPhone", written by the browser when it subscribes, so the list
  -- of devices means something to the person reading it.
  label           text not null default '',
  created_at      timestamptz not null default now(),
  last_success_at timestamptz,
  last_error      text,
  failures        integer not null default 0
);

create index push_subscriptions_by_user on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Your own devices, and only while you are an administrator. Nobody manages
-- anyone else's phone from the console; revoking someone's access stops their
-- pushes because the notifier only sends to current administrators.
create policy push_subscriptions_own on public.push_subscriptions
  for all
  using (user_id = auth.uid() and public.is_admin())
  with check (user_id = auth.uid() and public.is_admin());

-- ── sent once ────────────────────────────────────────────────────────────────
-- The Telegram delivery is retried until it works; a push is not. A push that
-- arrives twelve minutes late, or twice, is worse than one that does not arrive
-- — so it is claimed exactly once, before it is sent, and never again.

alter table public.orders add column push_sent_at timestamptz;

create or replace function public.claim_order_push(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claimed uuid;
begin
  update public.orders
     set push_sent_at = now()
   where id = p_id
     and push_sent_at is null
  returning id into v_claimed;

  return v_claimed is not null;
end;
$$;

revoke all on function public.claim_order_push(uuid) from public;
grant execute on function public.claim_order_push(uuid) to service_role;

-- ── the public half of the key pair ──────────────────────────────────────────
-- Browsers need the server's public key to subscribe; it is public by design.
-- Kept here rather than in an environment variable so setting up push is one
-- SQL statement and a function secret, not a redeploy of the site. The private
-- half lives only in the notify-order function's secrets.

insert into public.settings (key, value, note) values
  ('vapid_public_key', null,
   'The Web Push public key, as a JSON string. Generate the pair with ' ||
   '`npm run vapid`; the private half goes into the notify-order function as ' ||
   'VAPID_PRIVATE_KEY. docs/push-setup.md has the steps.')
on conflict (key) do nothing;
