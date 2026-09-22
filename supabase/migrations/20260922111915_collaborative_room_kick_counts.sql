-- A player may request access again after two kicks or refusals. The third
-- action becomes a permanent exclusion or refusal for that room.
alter table public.bracket_rooms
  add column if not exists kick_counts jsonb not null default '{}'::jsonb;

alter table public.tierlist_rooms
  add column if not exists kick_counts jsonb not null default '{}'::jsonb;

alter table public.bracket_rooms
  add column if not exists rejection_counts jsonb not null default '{}'::jsonb;

alter table public.tierlist_rooms
  add column if not exists rejection_counts jsonb not null default '{}'::jsonb;

-- Existing exclusions were created by the old one-kick rule, so reset them to
-- the new policy rather than preserving a permanent ban after one removal.
update public.bracket_rooms
set
  excluded_player_ids = '[]'::jsonb,
  rejected_player_ids = '[]'::jsonb;

update public.tierlist_rooms
set
  excluded_player_ids = '[]'::jsonb,
  rejected_player_ids = '[]'::jsonb;
