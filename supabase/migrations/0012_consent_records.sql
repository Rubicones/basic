-- ════ 0012 — cookie consent log ═════════════════════════════════════════════
--
-- One row per decision made in the cookie banner or settings dialog: the proof
-- of what was agreed to, when, against which policy and UI. Anonymous — a random
-- per-browser id, no IP, no user agent.
--
-- The public role may insert and nothing else: it cannot read back anyone's
-- choices, its own included. Administrators can read.

create table public.consent_records (
  id             bigint generated always as identity primary key,
  consent_id     uuid not null,
  decided_at     timestamptz not null,
  received_at    timestamptz not null default now(),
  analytics      boolean not null,
  marketing      boolean not null,
  policy_version text not null check (length(policy_version) <= 32),
  ui_version     text not null check (length(ui_version) <= 16),
  locale         text not null references public.locales (code),
  schema         text not null check (length(schema) <= 500)
);

create index consent_records_by_id on public.consent_records (consent_id, decided_at desc);

alter table public.consent_records enable row level security;

create policy consent_records_insert on public.consent_records
  for insert to anon, authenticated
  -- A decision dated far from now is not a decision made just now.
  with check (decided_at between now() - interval '1 day' and now() + interval '1 day');

create policy consent_records_admin_read on public.consent_records
  for select using (public.is_admin());

grant insert on public.consent_records to anon, authenticated;
