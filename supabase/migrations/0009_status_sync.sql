-- ── statuses, in the shop's words, and the staff chat kept in step ──────────
--
-- The console had new / confirmed / done / cancelled. The shop says new /
-- processing / completed / canceled, and a status is a word staff read forty
-- times a day, so the enum is renamed rather than relabelled in three places.
-- `rename value` rewrites no rows: existing orders keep their status, under its
-- new name.

alter type public.order_status rename value 'confirmed' to 'processing';
alter type public.order_status rename value 'done'      to 'completed';
alter type public.order_status rename value 'cancelled' to 'canceled';

-- ── what the Telegram message currently says ─────────────────────────────────
--
-- When a status changes in the console, the order's message in the staff chat is
-- edited to say so — one card per order that is always true, rather than a
-- stream of "order 42 is now completed" replies burying the next order.
--
--  · telegram_chat_id — the chat the message actually lives in. The chat id in
--    `settings` can change (a group upgraded to a supergroup gets a new one);
--    an edit has to go where the message is, not where new ones go.
--  · telegram_status — the status the message shows. Different from `status`
--    means the edit has not landed yet, which is also what the sweep looks for.
--  · status_changed_at — when the console last changed it, so the sweep retries
--    a failed edit for a day and then stops, rather than forever.

alter table public.orders
  add column telegram_chat_id  bigint,
  add column telegram_status   public.order_status,
  add column status_changed_at timestamptz;

-- The old three-argument version is replaced, not overloaded: with a default on
-- the fourth argument, both would match a three-argument call and Postgres would
-- refuse to choose.
drop function if exists public.record_order_notification(uuid, bigint, text);

/**
 * The outcome of a delivery or an edit, written in one statement.
 *
 * `p_status` is the status the message was rendered with — not whatever the row
 * says now. If a colleague changed it between the render and this write, the two
 * differ, and the sweep sends the edit that closes the gap.
 */
create or replace function public.record_order_notification(
  p_id         uuid,
  p_message_id bigint,
  p_error      text,
  p_status     public.order_status default null,
  p_chat_id    bigint default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_message_id is not null then
    update public.orders
       set telegram_message_id = p_message_id,
           telegram_chat_id    = coalesce(p_chat_id, telegram_chat_id),
           telegram_status     = coalesce(p_status, telegram_status),
           notified_at         = coalesce(notified_at, now()),
           notify_error        = null
     where id = p_id;
  else
    update public.orders
       set notify_error = left(coalesce(p_error, 'unknown'), 500)
     where id = p_id;
  end if;
end;
$$;

revoke all on function public.record_order_notification(uuid, bigint, text, public.order_status, bigint) from public;
grant execute on function public.record_order_notification(uuid, bigint, text, public.order_status, bigint) to service_role;

/** Stamp the change, so the sweep knows how recent an unsynced status is. */
create or replace function public.stamp_status_change()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    new.status_changed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists orders_stamp_status on public.orders;
create trigger orders_stamp_status
  before update of status on public.orders
  for each row execute function public.stamp_status_change();

/**
 * Ask the notifier to edit the message.
 *
 * Only once there is a message: an order whose announcement has not gone out
 * yet will be announced with whatever its status is by then, so there is
 * nothing to edit. Like the insert trigger, this never fails the update — a
 * status change in the console must not be refused because Telegram is not
 * configured.
 */
create or replace function public.notify_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_endpoint text;
  v_secret   text;
begin
  if new.status is not distinct from old.status or new.telegram_message_id is null then
    return new;
  end if;

  select value #>> '{}' into v_endpoint from public.settings where key = 'notify_endpoint';
  select decrypted_secret into v_secret
    from vault.decrypted_secrets
   where name = 'notify_webhook_secret';

  if v_endpoint is null or v_endpoint = '' or v_secret is null then
    return new;
  end if;

  perform net.http_post(
    url     := v_endpoint,
    headers := jsonb_build_object(
                 'content-type', 'application/json',
                 'x-notify-secret', v_secret
               ),
    body    := jsonb_build_object(
                 'type', 'STATUS',
                 'table', 'orders',
                 'record', jsonb_build_object('id', new.id)
               ),
    timeout_milliseconds := 5000
  );

  return new;
exception
  when others then
    raise log 'notify_order_status: % (order %), left for the sweep', sqlerrm, new.id;
    return new;
end;
$$;

revoke all on function public.notify_order_status() from public;

drop trigger if exists orders_notify_status on public.orders;
create trigger orders_notify_status
  after update of status on public.orders
  for each row execute function public.notify_order_status();

-- ── the sweep learns about edits ─────────────────────────────────────────────
-- Same function, second loop: messages that exist but show a stale status,
-- changed in the last day and more than a minute ago (the trigger gets first
-- refusal, as with new orders).

create or replace function public.sweep_order_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_endpoint text;
  v_secret   text;
  v_order    record;
  v_sent     integer := 0;
begin
  select value #>> '{}' into v_endpoint from public.settings where key = 'notify_endpoint';
  if v_endpoint is null or v_endpoint = '' then
    raise log 'sweep_order_notifications: settings.notify_endpoint is not set, nothing swept';
    return 0;
  end if;

  select decrypted_secret into v_secret
    from vault.decrypted_secrets
   where name = 'notify_webhook_secret';

  if v_secret is null then
    raise log 'sweep_order_notifications: vault secret notify_webhook_secret is missing';
    return 0;
  end if;

  -- New orders nobody has been told about.
  for v_order in
    select o.id
      from public.orders o
     where o.notified_at is null
       and o.telegram_message_id is null
       and o.created_at < now() - interval '2 minutes'
       and o.notify_attempts < 10
       and (
         o.notify_attempted_at is null
         or o.notify_attempted_at <
            now() - least(interval '1 hour',
                          interval '1 minute' * power(2, o.notify_attempts))
       )
     order by o.created_at
     limit 20
  loop
    perform net.http_post(
      url     := v_endpoint,
      headers := jsonb_build_object('content-type', 'application/json',
                                    'x-notify-secret', v_secret),
      body    := jsonb_build_object('type', 'SWEEP', 'table', 'orders',
                                    'record', jsonb_build_object('id', v_order.id)),
      timeout_milliseconds := 15000
    );
    v_sent := v_sent + 1;
  end loop;

  -- Messages showing a status the console has since changed.
  for v_order in
    select o.id
      from public.orders o
     where o.telegram_message_id is not null
       and o.telegram_status is distinct from o.status
       and o.status_changed_at > now() - interval '1 day'
       and o.status_changed_at < now() - interval '1 minute'
     order by o.status_changed_at
     limit 20
  loop
    perform net.http_post(
      url     := v_endpoint,
      headers := jsonb_build_object('content-type', 'application/json',
                                    'x-notify-secret', v_secret),
      body    := jsonb_build_object('type', 'STATUS', 'table', 'orders',
                                    'record', jsonb_build_object('id', v_order.id)),
      timeout_milliseconds := 15000
    );
    v_sent := v_sent + 1;
  end loop;

  if v_sent > 0 then
    raise log 'sweep_order_notifications: re-invoked % order(s)', v_sent;
  end if;

  return v_sent;
end;
$$;

revoke all on function public.sweep_order_notifications() from public;
