alter table public.bracket_rooms
  add column if not exists revision integer not null default 0;
