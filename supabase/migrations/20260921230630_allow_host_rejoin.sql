-- A player who closes a tab leaves the active roster. Keep the most recently
-- departed original host separately so that they can reclaim their room when
-- reopening its link, without allowing arbitrary mid-game joins.
alter table public.bracket_rooms
  add column if not exists previous_host_id uuid;

alter table public.tierlist_rooms
  add column if not exists previous_host_id uuid;
