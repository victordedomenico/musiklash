-- Three consecutive rounds without a ballot moves a tierlist player back to
-- spectator mode. Counts reset after the host accepts a new request to join.
alter table public.tierlist_rooms
  add column if not exists missed_vote_counts jsonb not null default '{}'::jsonb;
