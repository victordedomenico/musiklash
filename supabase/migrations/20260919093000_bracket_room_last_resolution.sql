-- Persist the latest collaborative duel outcome so every connected client
-- reveals the same winner and, when tied, the same server-side coin toss.
alter table public.bracket_rooms
  add column if not exists last_resolution jsonb;
