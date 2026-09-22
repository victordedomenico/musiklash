-- A kicked player remains excluded even if their client tries its automatic
-- room-rejoin path after the host removes them from participants.
alter table public.bracket_rooms
  add column if not exists excluded_player_ids jsonb not null default '[]'::jsonb;
