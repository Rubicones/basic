-- ── behaviour, as the three kinds of caller see it ───────────────────────────
--
-- Every check runs as the role that would really make the call: `anon` for the
-- shop's customers, `authenticated` with an administrator's id for the console,
-- `service_role` for the notifier. RLS is the thing under test as often as the
-- functions are, and the table owner would sail straight past it.

set client_min_messages = notice;

create schema t;
grant usage on schema t to anon, authenticated, service_role;

create function t.check(name text, passed boolean, detail text default '') returns void
language plpgsql as $$
begin
  if passed then
    raise notice '  ok   %', name;
  else
    raise notice '  FAIL % — %', name, coalesce(detail, '');
  end if;
end;
$$;
grant execute on function t.check(text, boolean, text) to anon, authenticated, service_role;

-- The people: one administrator, one signed-in stranger.
insert into auth.users values
  ('00000000-0000-4000-8000-00000000a001', 'owner@basic.rs'),
  ('00000000-0000-4000-8000-00000000b002', 'stranger@example.com');
insert into public.admins (user_id, email) values
  ('00000000-0000-4000-8000-00000000a001', 'owner@basic.rs');

-- The wiring the notifier needs, as docs/telegram-setup.md sets it.
update public.settings set value = to_jsonb('https://example.supabase.co/functions/v1/notify-order'::text)
 where key = 'notify_endpoint';
select vault.create_secret('s3cret', 'notify_webhook_secret');

-- A valid set of answers for the seeded form.
create table t.answers as select jsonb_build_object(
  'venue', 'Kafić <Kod Mike> & co',
  'contact', 'Mika',
  'phone', '+381 64 123 4567',
  'city', 'beograd',
  'date', '2026-10-01',
  'comment', ''
) as value;
grant select on t.answers to anon, authenticated, service_role;

\echo 'the catalogue, seen by a customer'
begin;
set local role anon;
do $$
declare n int; drafts int;
begin
  select count(*) into n from public.products;
  perform t.check('the seed is readable: 18 published products', n = 18, n::text);
  select count(*) into drafts from public.products where not is_published;
  perform t.check('no draft is visible', drafts = 0, drafts::text);
end $$;
rollback;

update public.products set is_published = false where slug = 'sirniki';
begin;
set local role anon;
do $$
declare n int;
begin
  select count(*) into n from public.products;
  perform t.check('an unpublished product disappears for customers', n = 17, n::text);
  select count(*) into n from public.product_translations t
    join public.products p on p.id = t.product_id where p.slug = 'sirniki';
  perform t.check('and so do its names', n = 0, n::text);
end $$;
rollback;

\echo
\echo 'placing an order'
begin;
set local role anon;
do $$
declare v_id uuid; v_order public.orders; n int; v_name text;
begin
  select public.submit_order(
    'ru',
    '[{"slug":"medovik","variant":"piece","qty":2,"unit_price_rsd":1},
      {"slug":"cizkejk-njujork","variant":"whole","qty":1}]'::jsonb,
    (select value from t.answers)
  ) into v_id;
  perform t.check('a customer can place an order', v_id is not null);
end $$;
commit;

do $$
declare v_order public.orders; n int; v_name text; v_request jsonb;
begin
  select * into v_order from public.orders order by created_at desc limit 1;
  perform t.check('priced by the database, not the client (2×450 + 3420)', v_order.total_rsd = 4320, v_order.total_rsd::text);
  perform t.check('status new, locale ru, a human number', v_order.status = 'new' and v_order.locale = 'ru' and v_order.number is not null);

  select name_snapshot into v_name from public.order_items where order_id = v_order.id and variant = 'piece';
  perform t.check('names snapshotted in the customer''s language', v_name = 'Медовик', v_name);

  select count(*) into n from public.order_answers where order_id = v_order.id;
  perform t.check('empty answers are not stored', n = 5, n::text);

  perform t.check('a new order is held, so the insert trigger stays quiet', not exists (select 1 from net.requests where body->'record'->>'id' = v_order.id::text));
  update public.orders set release_at = now() - interval '1 second' where id = v_order.id;
  perform public.release_held_orders();
  select body into v_request from net.requests order by id desc limit 1;
  perform t.check('the release job asked the notifier', v_request->>'type' = 'INSERT' and v_request->'record'->>'id' = v_order.id::text, coalesce(v_request::text, 'no request'));
  select headers into v_request from net.requests order by id desc limit 1;
  perform t.check('with the shared secret', v_request->>'x-notify-secret' = 's3cret');
end $$;

begin;
set local role anon;
do $$
begin
  begin
    perform public.submit_order('sr', '[{"slug":"medovik","variant":"piece","qty":1}]'::jsonb,
      (select value - 'phone' from t.answers));
    perform t.check('a missing required field is refused', false, 'accepted');
  exception when others then
    perform t.check('a missing required field is refused', sqlerrm = 'order_missing_field:phone', sqlerrm);
  end;

  begin
    perform public.submit_order('sr', '[{"slug":"medovik","variant":"whole","qty":1}]'::jsonb, (select value from t.answers));
    perform t.check('"whole" of a product sold only by the piece is refused', false, 'accepted');
  exception when others then
    perform t.check('"whole" of a product sold only by the piece is refused', sqlerrm = 'order_unknown_product:medovik', sqlerrm);
  end;

  begin
    perform public.submit_order('sr', '[{"slug":"sirniki","variant":"piece","qty":1}]'::jsonb, (select value from t.answers));
    perform t.check('an unpublished product cannot be ordered', false, 'accepted');
  exception when others then
    perform t.check('an unpublished product cannot be ordered', sqlerrm like 'order_unknown_product:%', sqlerrm);
  end;

  begin
    perform public.submit_order('sr', '[{"slug":"medovik","variant":"piece","qty":0}]'::jsonb, (select value from t.answers));
    perform t.check('a zero quantity is refused', false, 'accepted');
  exception when others then
    perform t.check('a zero quantity is refused', sqlerrm = 'order_bad_quantity', sqlerrm);
  end;

  begin
    perform public.submit_order('sr', '[]'::jsonb, (select value from t.answers));
    perform t.check('an empty cart is refused', false, 'accepted');
  exception when others then
    perform t.check('an empty cart is refused', sqlerrm = 'order_empty', sqlerrm);
  end;

  begin
    insert into public.orders (locale, total_rsd) values ('sr', 1);
    perform t.check('a customer cannot write an order directly', false, 'inserted');
  exception when others then
    perform t.check('a customer cannot write an order directly', sqlerrm like '%row-level security%', sqlerrm);
  end;
end $$;
do $$
declare n int;
begin
  select count(*) into n from public.orders;
  perform t.check('a customer cannot read orders', n = 0, n::text);
end $$;
rollback;

\echo
\echo 'announcing it'
begin;
set local role service_role;
do $$
declare v_id uuid; v_claim public.orders; v_again public.orders; v_row public.orders;
begin
  select id into v_id from public.orders order by created_at desc limit 1;
  update public.orders set release_at = now() - interval '1 second' where id = v_id and released_at is null;
  perform public.release_held_orders();

  v_claim := public.claim_order_notification(v_id);
  perform t.check('the first claim gets the order', v_claim.id = v_id and v_claim.notify_attempts = 1, v_claim.notify_attempts::text);

  perform public.record_order_notification(v_id, 5150, null, 'new', -1001111111111);
  select * into v_row from public.orders where id = v_id;
  perform t.check('a delivery records message, chat and status', v_row.telegram_message_id = 5150 and v_row.telegram_chat_id = -1001111111111 and v_row.telegram_status = 'new' and v_row.notified_at is not null);

  v_again := public.claim_order_notification(v_id);
  perform t.check('a second webhook claims nothing', v_again.id is null);

  perform t.check('push is claimed exactly once', public.claim_order_push(v_id) and not public.claim_order_push(v_id));
end $$;
commit;

\echo
\echo 'changing its status from the console'
delete from net.requests;
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-00000000a001';
do $$
declare v_id uuid; n int;
begin
  select id into v_id from public.orders order by created_at desc limit 1;
  update public.orders set status = 'completed' where id = v_id;
  get diagnostics n = row_count;
  perform t.check('an administrator can change a status', n = 1, n::text);
end $$;
commit;

do $$
declare v_row public.orders; v_request jsonb;
begin
  select * into v_row from public.orders order by created_at desc limit 1;
  perform t.check('the change is stamped', v_row.status_changed_at is not null);
  select body into v_request from net.requests order by id desc limit 1;
  perform t.check('the notifier is asked to edit the message', v_request->>'type' = 'STATUS' and v_request->'record'->>'id' = v_row.id::text, coalesce(v_request::text, 'no request'));
  perform t.check('the renamed statuses exist', 'processing'::public.order_status is not null and 'canceled'::public.order_status is not null);
end $$;

do $$
begin
  perform 'confirmed'::public.order_status;
  perform t.check('the old status names are gone', false, 'still valid');
exception when others then
  perform t.check('the old status names are gone', true);
end $$;

begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-00000000b002';
do $$
declare n int;
begin
  update public.orders set status = 'canceled';
  get diagnostics n = row_count;
  perform t.check('a signed-in non-administrator changes nothing', n = 0, n::text);
end $$;
rollback;

-- An order the chat has not heard of yet: its status can change without an edit.
insert into public.orders (locale, total_rsd) values ('en', 100);
delete from net.requests;
update public.orders set status = 'processing' where telegram_message_id is null and total_rsd = 100;
do $$
declare n int;
begin
  select count(*) into n from net.requests where body->>'type' = 'STATUS';
  perform t.check('no edit is requested for an unannounced order', n = 0, n::text);
end $$;

\echo
\echo 'the sweep'
delete from net.requests;
-- Stale: announced as "new", completed ten minutes ago, the edit never landed.
update public.orders set telegram_status = 'new', status_changed_at = now() - interval '10 minutes'
 where telegram_message_id = 5150;
-- Old enough, never announced, tried once a while ago.
update public.orders set created_at = now() - interval '10 minutes', notify_attempts = 1,
       notify_attempted_at = now() - interval '5 minutes'
 where total_rsd = 100;
-- Given up: ten attempts.
insert into public.orders (locale, total_rsd, created_at, notify_attempts, notify_error)
values ('sr', 200, now() - interval '1 hour', 10, 'Unauthorized');
-- Too fresh: the trigger gets first refusal.
insert into public.orders (locale, total_rsd) values ('sr', 300);
delete from net.requests;

do $$
declare n int; v_types text;
begin
  n := public.sweep_order_notifications();
  select string_agg(body->>'type', ',' order by body->>'type') into v_types from net.requests;
  perform t.check('picks up one stale edit and one unannounced order', n = 2 and v_types = 'STATUS,SWEEP', n || ': ' || coalesce(v_types, ''));
end $$;

do $$
declare n int;
begin
  delete from net.requests;
  update public.orders set notify_attempted_at = now() - interval '30 seconds' where total_rsd = 100;
  update public.orders set telegram_status = status where telegram_message_id = 5150;
  n := public.sweep_order_notifications();
  perform t.check('backs off after a recent attempt, and leaves synced orders alone', n = 0, n::text);
end $$;

do $$
declare n int; v_gave_up boolean;
begin
  select count(*) into n from public.orders_awaiting_notification;
  select gave_up into v_gave_up from public.orders_awaiting_notification where total_rsd = 200;
  perform t.check('orders_awaiting_notification lists the stuck ones', n = 3, n::text);
  perform t.check('and marks the one it gave up on', v_gave_up);
end $$;

\echo
\echo 'push subscriptions'
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-00000000a001';
do $$
begin
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, label)
  values ('00000000-0000-4000-8000-00000000a001', 'https://push.example/owner-phone', 'k', 'a', 'Safari on iPhone');
  perform t.check('an administrator can add their own device', true);

  begin
    insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
    values ('00000000-0000-4000-8000-00000000b002', 'https://push.example/planted', 'k', 'a');
    perform t.check('but not one in somebody else''s name', false, 'inserted');
  exception when others then
    perform t.check('but not one in somebody else''s name', sqlerrm like '%row-level security%', sqlerrm);
  end;
end $$;
commit;

begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-00000000b002';
do $$
declare n int;
begin
  select count(*) into n from public.push_subscriptions;
  perform t.check('a non-administrator sees no devices', n = 0, n::text);
  begin
    insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
    values ('00000000-0000-4000-8000-00000000b002', 'https://push.example/stranger', 'k', 'a');
    perform t.check('and cannot subscribe', false, 'inserted');
  exception when others then
    perform t.check('and cannot subscribe', sqlerrm like '%row-level security%', sqlerrm);
  end;
end $$;
rollback;

begin;
set local role anon;
do $$
declare n int;
begin
  select count(*) into n from public.settings;
  perform t.check('customers cannot read settings, VAPID key included', n = 0, n::text);
end $$;
rollback;

\echo
\echo 'what the console and the import write'
do $$
begin
  begin
    insert into public.products (slug, price_rsd, has_whole, whole_price_rsd) values ('test-whole', 500, true, null);
    perform t.check('offering "whole" without its price is refused', false, 'inserted');
  exception when check_violation then
    perform t.check('offering "whole" without its price is refused', true);
  end;

  begin
    insert into public.products (slug, price_rsd, tag) values ('test-tag', 500, repeat('x', 25));
    perform t.check('a tag over 24 characters is refused', false, 'inserted');
  exception when check_violation then
    perform t.check('a tag over 24 characters is refused', true);
  end;
end $$;

-- The import's order of operations: drafts, then names, then publish.
begin;
insert into public.products (slug, price_rsd, formats, is_published)
values ('import-a', 300, '{ambient}', false), ('import-b', 310, '{chilled}', false)
on conflict (slug) do update set price_rsd = excluded.price_rsd;
insert into public.product_translations (product_id, locale, name, note)
select id, 'en', 'Import ' || slug, '' from public.products where slug in ('import-a', 'import-b');
update public.products set is_published = true where slug in ('import-a', 'import-b');
commit;
do $$
declare n int;
begin
  select count(*) into n from public.products where slug like 'import-%' and is_published;
  perform t.check('drafts → names → publish goes live', n = 2, n::text);
end $$;

do $$
begin
  -- The check is deferred to commit; made immediate here so the refusal lands
  -- inside this block rather than on the COMMIT after it.
  set constraints all immediate;
  insert into public.products (slug, price_rsd, formats, is_published) values ('nameless', 300, '{ambient}', true);
  perform t.check('publishing without a default-language name is refused', false, 'inserted');
exception when others then
  perform t.check('publishing without a default-language name is refused', sqlerrm like '%cannot be published%', sqlerrm);
end $$;

-- A re-import that leaves the photo column empty must not touch the photo.
update public.products set photo_path = 'a1b2c3d4e5f60718.webp', photo_blur = 'data:x' where slug = 'import-a';
insert into public.products (slug, price_rsd, formats, is_published)
values ('import-a', 350, '{ambient}', false)
on conflict (slug) do update set price_rsd = excluded.price_rsd, formats = excluded.formats;
do $$
declare v_path text;
begin
  select photo_path into v_path from public.products where slug = 'import-a';
  perform t.check('an upsert that does not name the photo keeps it', v_path = 'a1b2c3d4e5f60718.webp', coalesce(v_path, 'null'));
end $$;

\echo
\echo 'the order form'
insert into public.order_fields (key, control, options_source, is_required, is_enabled, position)
values ('delivery_slot', 'select', 'list', true, false, 50);
insert into public.order_field_translations (field_id, locale, label, options, purpose)
select id, 'en', 'Slot', '{Morning,Noon}', 'Plan the delivery round.' from public.order_fields where key = 'delivery_slot';
update public.order_fields set is_enabled = true where key = 'delivery_slot';

begin;
set local role anon;
do $$
declare n int; v_options text[];
begin
  select count(*) into n from public.order_fields;
  perform t.check('customers see enabled fields only (7 seeded + 1 new)', n = 8, n::text);
  select options into v_options from public.order_field_translations t
    join public.order_fields f on f.id = t.field_id where f.key = 'delivery_slot';
  perform t.check('a hand-written choice list reaches the site', v_options = '{Morning,Noon}', v_options::text);

  begin
    perform public.submit_order('sr', '[{"slug":"medovik","variant":"piece","qty":1}]'::jsonb, (select value from t.answers));
    perform t.check('a new required field is enforced on the next order', false, 'accepted');
  exception when others then
    perform t.check('a new required field is enforced on the next order', sqlerrm = 'order_missing_field:delivery_slot', sqlerrm);
  end;
end $$;
rollback;

do $$
begin
  insert into public.order_fields (key, control, input_type, rows) values ('broken', 'input', 'text', 3);
  perform t.check('an impossible field shape is refused', false, 'inserted');
exception when check_violation then
  perform t.check('an impossible field shape is refused', true);
end $$;

\echo
\echo 'form governance and retention (0011)'
do $$
declare n int; v_keys text[];
begin
  begin
    update public.order_fields set sensitivity = 'special_category', is_required = true where key = 'comment';
    perform t.check('a special-category field cannot be required', false, 'updated');
  exception when check_violation then
    perform t.check('a special-category field cannot be required', true);
  end;

  begin
    update public.order_field_translations set purpose = ''
     where locale = 'en' and field_id = (select id from public.order_fields where key = 'venue');
    set constraints all immediate;
    perform t.check('an enabled field cannot lose its purpose', false, 'updated');
  exception when check_violation then
    perform t.check('an enabled field cannot lose its purpose', sqlerrm = 'order_field_needs_purpose', sqlerrm);
  end;

  select count(*) into n from public.order_field_audit;
  update public.order_field_translations set help = 'audited'
   where locale = 'en' and field_id = (select id from public.order_fields where key = 'venue');
  perform t.check('a field change writes an audit row with before and after',
    (select count(*) from public.order_field_audit) = n + 1
    and (select before is not null and after is not null from public.order_field_audit order by id desc limit 1),
    ((select count(*) from public.order_field_audit) - n)::text);

  insert into public.orders (id, locale, total_rsd, created_at)
  values ('00000000-0000-0000-0000-0000000000aa', 'en', 100, now() - interval '25 months');
  insert into public.order_answers (order_id, field_key, label_snapshot, value)
  values ('00000000-0000-0000-0000-0000000000aa', 'venue', 'Venue', 'Café'),
         ('00000000-0000-0000-0000-0000000000aa', 'phone', 'Phone', '+381');
  perform public.purge_old_order_answers();
  select array_agg(field_key) into v_keys from public.order_answers
   where order_id = '00000000-0000-0000-0000-0000000000aa';
  perform t.check('retention clears old answers but keeps invoice data', v_keys = '{venue}', v_keys::text);
end $$;

\echo
\echo 'the minute to change your mind (0013)'
do $$
declare r jsonb; ok boolean; n int; v_id uuid;
begin
  r := public.submit_order_held('en', '[{"slug":"medovik","variant":"piece","qty":1}]'::jsonb, (select value from t.answers) || '{"delivery_slot":"Morning"}'::jsonb);
  v_id := (r->>'id')::uuid;
  perform t.check('a new order is held and has a token',
    (select public.order_is_held(o) and o.cancel_token = (r->>'token')::uuid from public.orders o where o.id = v_id), r::text);
  perform t.check('a held order cannot be claimed for Telegram',
    (select id from public.claim_order_notification(v_id)) is null);
  perform t.check('a held order cannot be claimed for push', not public.claim_order_push(v_id));
  perform t.check('the wrong token cancels nothing', not public.cancel_held_order(v_id, gen_random_uuid()));
  ok := public.cancel_held_order(v_id, (r->>'token')::uuid);
  perform t.check('the right token cancels it', ok and not exists (select 1 from public.orders where id = v_id));

  r := public.submit_order_held('en', '[{"slug":"medovik","variant":"piece","qty":1}]'::jsonb, (select value from t.answers) || '{"delivery_slot":"Morning"}'::jsonb);
  v_id := (r->>'id')::uuid;
  update public.orders set release_at = now() - interval '1 second' where id = v_id;
  n := public.release_held_orders();
  perform t.check('the release job releases it and forgets the token',
    (select released_at is not null and cancel_token is null from public.orders where id = v_id), n::text);
  perform t.check('a released order cannot be cancelled', not public.cancel_held_order(v_id, (r->>'token')::uuid));
  perform t.check('a released order can be claimed', (select id from public.claim_order_notification(v_id)) = v_id);
end $$;
