-- ── the retry sweep ──────────────────────────────────────────────────────────
--
-- A database webhook fires once. If the function was cold and timed out, if
-- Telegram was down for ninety seconds, if the bot was rate-limited — that is the
-- end of it, and the order sits in the table unannounced while the shop believes
-- it has been told. So something has to come back and look.
--
-- pg_cron and pg_net rather than a scheduled Edge Function, deliberately:
--
--  * The thing being swept is a query over rows in this database. A scheduled
--    function would have to ask the database the same question over HTTP, with a
--    service key, from another deployment artifact that has to be kept in step
--    with this schema. The cron job *is* the query.
--  * The backoff is a predicate — `notify_attempted_at < now() - <interval>` —
--    and it belongs where the columns are.
--  * One fewer secret in one fewer place.
--
-- The cost is honest: two extensions, and a schedule that lives in the database
-- rather than in the repository. `cron.job` is where it can be read back.

create extension if not exists pg_cron;
create extension if not exists pg_net;

/**
 * Re-announce whatever has not been announced.
 *
 * Deliberately conservative about what it picks up:
 *   · older than two minutes — the webhook gets first refusal, and a sweep that
 *     raced it would be the duplicate it is supposed to prevent;
 *   · under ten attempts — past that something is wrong that retrying will not
 *     fix, and the row stays in `orders_awaiting_notification` to be found;
 *   · backed off by attempt count — one minute, then two, four, eight, up to an
 *     hour, so a broken token is not a hundred requests an hour forever;
 *   · twenty at a time — a sweep is not a way to discover Telegram's flood limit.
 *
 * `net.http_post` returns immediately with a request id; the response lands in
 * `net._http_response` later. That is the point: the sweep is not waiting on
 * Telegram either. Whether a given attempt worked is read off the order, not off
 * the HTTP reply.
 */
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

  -- The same shared secret the webhook sends. In Vault rather than in `settings`,
  -- because `settings` is readable by every administrator and this is the one
  -- value that decides whether a request is genuinely from us.
  select decrypted_secret into v_secret
    from vault.decrypted_secrets
   where name = 'notify_webhook_secret';

  if v_secret is null then
    raise log 'sweep_order_notifications: vault secret notify_webhook_secret is missing';
    return 0;
  end if;

  for v_order in
    select o.id, o.notify_attempts
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
      headers := jsonb_build_object(
                   'content-type', 'application/json',
                   'x-notify-secret', v_secret
                 ),
      body    := jsonb_build_object(
                   'type', 'SWEEP',
                   'table', 'orders',
                   'record', jsonb_build_object('id', v_order.id)
                 ),
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

-- Every two minutes. With the two-minute floor above, a webhook that silently
-- did nothing costs a customer four minutes of the shop not knowing — and a
-- shop that is closed at 03:00 loses nothing by the sweep running anyway.
select cron.schedule(
  'sweep-order-notifications',
  '*/2 * * * *',
  $$select public.sweep_order_notifications();$$
);
