-- battle_feat_rooms: drop FK on current_artist_id, then convert to text
alter table public.battle_feat_rooms
  drop constraint if exists battle_feat_rooms_current_artist_id_fkey;

alter table public.battle_feat_rooms
  alter column current_artist_id type text using current_artist_id::text;

alter table public.battle_feat_rooms
  add column if not exists starting_artist_id   text,
  add column if not exists starting_artist_name text,
  add column if not exists starting_artist_pic  text,
  add column if not exists current_artist_name  text,
  add column if not exists current_artist_pic   text;

-- battle_feat_solo_sessions:
--   starting_artist_id was UUID FK to rap_artists, drop FK and convert to text

alter table public.battle_feat_solo_sessions
  drop constraint if exists battle_feat_solo_sessions_starting_artist_id_fkey;

alter table public.battle_feat_solo_sessions
  alter column starting_artist_id type text using starting_artist_id::text;
