-- ── a whole cake is priced, not multiplied ───────────────────────────────────
--
-- `whole_multiplier` was a guess wearing a number. It existed because the summer
-- price sheet has no whole-cake row for either cheesecake, so their whole price
-- was taken as the piece price × 6 — while every cake the sheet *does* price is
-- priced on its own, at a figure that is not a multiple of anything. The owner
-- types that figure in now.
--
-- `price_is_placeholder` goes with it: it marked a price as provisional, no
-- surface ever rendered it, and the honest way to say "no price yet" is to leave
-- the product unpublished.
--
-- Existing rows carry over at exactly what the multiplier implied, so the site
-- shows the same numbers the moment this runs.

alter table public.products
  add column whole_price_rsd integer check (whole_price_rsd >= 0);

update public.products
   set whole_price_rsd = price_rsd * whole_multiplier
 where has_whole;

alter table public.products
  drop column whole_multiplier,
  drop column price_is_placeholder;

-- The toggle and the price are one fact: a card that offers "whole" has to have
-- a number to put on it. Checked here as well as in the console, because the
-- console is not the only thing that will ever write to this table.
alter table public.products
  add constraint products_whole_price
  check (not has_whole or whole_price_rsd is not null);
