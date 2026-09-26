-- ── the corner tag ───────────────────────────────────────────────────────────
--
-- One short word in the top-left corner of a card: "Hit", "Novo", "Sezonsko".
--
-- Deliberately NOT translated, and deliberately not a table of its own. Every
-- other piece of customer-facing text here has a row per language and the console
-- asks for all three; this one is a word the owner types once and the card shows
-- as typed, in every language. That is a decision, not an oversight: the tags in
-- use are short and read the same in all three, and a dictionary of tags would
-- cost a screen, a join and three inputs to say "Hit".
--
-- Stored trimmed, and never as an empty string — absent is null, so "has a tag"
-- is one test and not two.

alter table public.products
  add column tag text
  check (tag is null or length(btrim(tag)) between 1 and 24);
