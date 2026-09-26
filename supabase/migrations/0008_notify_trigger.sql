-- ── the webhook, as a migration ──────────────────────────────────────────────
--
-- A Supabase "Database Webhook" is a trigger that calls pg_net. This is that
-- trigger, written out, for three reasons:
--
--  * It lives in the repository. A webhook made by clicking through the
--    dashboard is configuration nobody can review, diff or recreate on a second
--    project without remembering the clicks.
--  * It reads the endpoint and the secret from the same two places the retry
--    sweep does — `settings.notify_endpoint` and the Vault secret
--    `notify_webhook_secret` — so the two cannot drift apart. The dashboard
--    version holds its own copy of both.
--  * The dashboard moves the feature around between releases; SQL does not.
--
-- If you already created a webhook in the dashboard as well, delete one of the
-- two. Nothing would be sent twice — `claim_order_notification` sees to that —
-- but every order would wake the function twice for no reason.

/**
 * Wake the notifier for a new order.
 *
 * The one rule here outranks all the others: this must never make the insert
 * fail. A customer's order that could not be written because Telegram was not
 * configured yet is the worst possible outcome of a notification system, so
 * every failure is logged and swallowed, and the sweep picks the order up once
 * whatever was missing is in place.
 *
 * `net.http_post` only queues the request. The queue is a table, the insert into
 * it belongs to this transaction, and the background worker cannot see it until
 * the transaction commits — so the function is never woken for an order that
 * then rolls back, and by the time it runs the items and answers `submit_order`
 * writes after this row are there too.
 */
create or replace function public.notify_order_inserted()
returns trigger
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
    raise log 'notify_order_inserted: endpoint or secret not configured, order % left for the sweep', new.id;
    return new;
  end if;

  perform net.http_post(
    url     := v_endpoint,
    headers := jsonb_build_object(
                 'content-type', 'application/json',
                 'x-notify-secret', v_secret
               ),
    body    := jsonb_build_object(
                 'type', 'INSERT',
                 'table', 'orders',
                 'record', jsonb_build_object('id', new.id)
               ),
    timeout_milliseconds := 5000
  );

  return new;
exception
  when others then
    raise log 'notify_order_inserted: % (order %), left for the sweep', sqlerrm, new.id;
    return new;
end;
$$;

revoke all on function public.notify_order_inserted() from public;

drop trigger if exists orders_notify on public.orders;

create trigger orders_notify
  after insert on public.orders
  for each row execute function public.notify_order_inserted();
