-- ─────────────────────────────────────────────────────────────────────────────
-- A choice field can carry its own list of options.
--
-- Until now `order_fields.options_source` could only point at one hard-coded
-- source ('cities'). A source of 'list' means the options are written by hand —
-- and because the form is translated, they are written per language, which is
-- why they live on the translation row rather than on the field.
--
-- The value stored in an order is the option as it reads in the default locale,
-- matched by position. That is what keeps an answer readable after someone
-- retranslates the list, and it is why the console refuses to save lists of
-- differing lengths: position is the only thing tying the languages together.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.order_field_translations
  add column if not exists options text[] not null default '{}';

comment on column public.order_field_translations.options is
  'Choice labels in this language, in the same order in every language. The value '
  'recorded in an order is the default-locale label at the matching position.';
