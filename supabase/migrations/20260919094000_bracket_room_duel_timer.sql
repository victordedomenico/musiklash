alter table public.bracket_rooms
  add column if not exists duel_started_at timestamptz;

update public.bracket_rooms
set duel_started_at = coalesce(duel_started_at, updated_at, now())
where status = 'playing';
