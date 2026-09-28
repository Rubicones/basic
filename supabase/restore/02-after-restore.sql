-- ── after the restore: what lived only in the database ───────────────────────
--
-- The migrations and the seed rebuild everything the repository describes.
-- These four things were typed into the database by hand, so they are typed in
-- again. Replace the values in CAPITALS, keep the quotes.

-- 1) You, as an administrator. Your login still exists in auth.users — only the
--    row that makes it an administrator was lost. Repeat for each person.
insert into public.admins (user_id, email)
select id, email from auth.users where lower(email) = lower('YOUR@EMAIL.COM')
on conflict (user_id) do nothing;

-- 2) The Telegram group.
update public.settings set value = to_jsonb(-5361286858::bigint)
 where key = 'telegram_chat_id';

-- 3) Where the notifier lives, for the retry sweep and the triggers.
update public.settings
   set value = to_jsonb('https://gjleuceeyebhrvglmgag.supabase.co/functions/v1/notify-order'::text)
 where key = 'notify_endpoint';

-- 4) Only if push was already set up: the public key `npm run vapid` printed.
--    If you no longer have it, run `npm run vapid` again and replace BOTH halves
--    (this row and VAPID_PRIVATE_KEY in the function's secrets).
-- update public.settings set value = to_jsonb('PUBLIC_KEY'::text)
--  where key = 'vapid_public_key';

-- ── check ────────────────────────────────────────────────────────────────────
select
  (select string_agg(email, ', ') from public.admins)                          as administrators,
  (select value from public.settings where key = 'telegram_chat_id')          as chat_id,
  (select value from public.settings where key = 'notify_endpoint')           as endpoint,
  (select count(*) from vault.decrypted_secrets where name = 'notify_webhook_secret') as vault_secret,
  (select count(*) from cron.job where jobname = 'sweep-order-notifications') as sweep_job;
