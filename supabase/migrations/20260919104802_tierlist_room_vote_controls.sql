alter table public.tierlist_rooms
  add column if not exists last_resolution jsonb,
  add column if not exists position_started_at timestamptz,
  add column if not exists revision integer not null default 0;

update public.tierlist_rooms
set position_started_at = coalesce(position_started_at, updated_at, now())
where status = 'playing';
