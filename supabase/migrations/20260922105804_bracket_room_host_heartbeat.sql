-- A client unload is only best-effort. Persist the last signal from the host so
-- participants can safely pause a playing room when that request is lost.
alter table public.bracket_rooms
  drop constraint if exists bracket_rooms_status_check;

alter table public.bracket_rooms
  add constraint bracket_rooms_status_check
  check (status in ('waiting', 'playing', 'paused', 'finished'));

alter table public.bracket_rooms
  add column if not exists host_last_seen_at timestamptz not null default now();
