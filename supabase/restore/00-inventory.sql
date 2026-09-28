-- ── what is in this database right now ─────────────────────────────────────
--
-- Read-only. Changes nothing. Run it before 01-restore.sql and keep the result:
-- it shows what the foreign migrations left *outside* `public` — which the
-- restore does not touch — and what of ours survived.
--
-- Each probe runs through dynamic SQL, so a missing extension or schema shows
-- up as a row saying so instead of stopping the whole query.

create temporary table inventory (section text, item text) on commit preserve rows;

do $$
declare
  probes text[][] := array[
    ['public tables',            $q$select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by 1$q$],
    ['public views',             $q$select table_name from information_schema.views where table_schema = 'public' order by 1$q$],
    ['public functions',         $q$select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' order by 1$q$],
    ['public types',             $q$select t.typname from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public' and t.typtype in ('e','d') order by 1$q$],
    ['other schemas',            $q$select nspname from pg_namespace where nspname not like 'pg\_%' and nspname not in ('public','information_schema','auth','storage','realtime','_realtime','supabase_functions','supabase_migrations','extensions','graphql','graphql_public','pgbouncer','pgsodium','pgsodium_masks','vault','net','cron','_analytics','pgmq','pgtle') order by 1$q$],
    ['triggers on auth.users',   $q$select tgname from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal order by 1$q$],
    ['auth users',               $q$select email from auth.users order by email$q$],
    ['storage buckets',          $q$select id || ' (' || (select count(*) from storage.objects o where o.bucket_id = b.id) || ' files)' from storage.buckets b order by 1$q$],
    ['cron jobs',                $q$select jobname || ' — ' || schedule || ' — ' || left(command, 80) from cron.job order by 1$q$],
    ['vault secrets',            $q$select name from vault.decrypted_secrets order by 1$q$],
    ['migration history',        $q$select version || ' ' || coalesce(name, '') from supabase_migrations.schema_migrations order by 1$q$]
  ];
  i int;
  v text;
begin
  for i in 1 .. array_length(probes, 1) loop
    begin
      for v in execute probes[i][2] loop
        insert into inventory values (probes[i][1], v);
      end loop;
    exception when others then
      insert into inventory values (probes[i][1], '(not available: ' || sqlerrm || ')');
    end;
  end loop;
end $$;

select section, item from inventory order by section, item;
