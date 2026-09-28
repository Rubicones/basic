-- ── the accident, reproduced ─────────────────────────────────────────────────
-- What another project's migrations do to this database when applied to it by
-- mistake: the usual first line of a from-scratch migration set drops `public`,
-- and then that project's own schema arrives. Used by `run.sh --restore` to
-- prove 01-restore.sql brings everything back from exactly this state.

drop schema public cascade;
create schema public;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

create type public.step_status as enum ('pending', 'approved', 'awaiting_human');
create sequence public.agent_seq;
create table public.agents (id uuid primary key default gen_random_uuid(), name text, n int default nextval('public.agent_seq'));
create table public.runs (id uuid primary key default gen_random_uuid(), agent_id uuid references public.agents(id));
create table public.steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.runs(id),
  step_key text,
  status public.step_status default 'pending',
  definition jsonb
);
alter table public.steps enable row level security;
create policy steps_read on public.steps for select using (true);
create view public.step_costs as select run_id, count(*) from public.steps group by run_id;

-- A profile-on-signup trigger: the classic thing a starter kit hangs on auth.users.
create table public.profiles (id uuid primary key references auth.users(id));
create function public.handle_new_user() returns trigger language plpgsql security definer as $$
begin insert into public.profiles (id) values (new.id); return new; end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

select cron.schedule('other-project-cleanup', '0 * * * *', 'delete from public.steps');

insert into public.agents (name) values ('planner');
insert into public.runs (agent_id) select id from public.agents;
insert into public.steps (run_id, step_key, status) select id, 'plan', 'approved' from public.runs;
