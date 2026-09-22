-- Hosts approve the roster before a player may participate in a collaborative game.
alter table public.bracket_rooms
  add column if not exists pending_participants jsonb not null default '[]'::jsonb,
  add column if not exists rejected_player_ids jsonb not null default '[]'::jsonb;

alter table public.tierlist_rooms
  add column if not exists pending_participants jsonb not null default '[]'::jsonb,
  add column if not exists rejected_player_ids jsonb not null default '[]'::jsonb,
  add column if not exists excluded_player_ids jsonb not null default '[]'::jsonb;
