-- ── what Supabase provides, and plain Postgres does not ──────────────────────
--
-- Just enough of each to let the migrations run and be tested on a stock
-- Postgres 16, with every stub recording what was asked of it so the tests can
-- read it back:
--
--   roles     anon / authenticated / service_role, with Supabase's default grants
--   auth      users, and auth.uid() read from the request's JWT subject
--   storage   the two tables the bucket policies are written against
--   vault     decrypted_secrets, as a plain table
--   cron      cron.schedule, recording the job
--   net       net.http_post, recording the request instead of sending it
--
-- None of this is shipped. It exists so that "the migrations work" is a thing
-- that was run, not a thing that was read.

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
create table auth.users (id uuid primary key, email text);
grant select on auth.users to anon, authenticated, service_role;

-- Supabase reads the subject out of the verified JWT; here the test sets it.
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create schema storage;
grant usage on schema storage to anon, authenticated, service_role;
create table storage.buckets (id text primary key, name text, public boolean);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text,
  name text
);
alter table storage.objects enable row level security;
grant all on storage.objects to anon, authenticated, service_role;

create schema vault;
create table vault.decrypted_secrets (name text primary key, decrypted_secret text);
create function vault.create_secret(secret text, name text) returns uuid language sql as $$
  insert into vault.decrypted_secrets values (name, secret)
    on conflict (name) do update set decrypted_secret = excluded.decrypted_secret;
  select gen_random_uuid();
$$;

create schema cron;
create table cron.job (jobid bigserial primary key, jobname text unique, schedule text, command text, active boolean default true);
create function cron.schedule(job_name text, schedule text, command text) returns bigint language sql as $$
  insert into cron.job (jobname, schedule, command) values (job_name, schedule, command)
    on conflict (jobname) do update set schedule = excluded.schedule, command = excluded.command
  returning jobid;
$$;

create schema net;
create table net.requests (
  id bigserial primary key,
  url text,
  headers jsonb,
  body jsonb,
  timeout_milliseconds int,
  created timestamptz default clock_timestamp()
);
create function net.http_post(
  url text,
  body jsonb default '{}'::jsonb,
  params jsonb default '{}'::jsonb,
  headers jsonb default '{}'::jsonb,
  timeout_milliseconds int default 5000
) returns bigint language sql as $$
  insert into net.requests (url, headers, body, timeout_milliseconds)
    values (url, headers, body, timeout_milliseconds)
  returning id;
$$;
