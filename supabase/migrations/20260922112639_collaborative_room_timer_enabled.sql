alter table public.bracket_rooms
  add column if not exists timer_enabled boolean not null default false;

alter table public.tierlist_rooms
  add column if not exists timer_enabled boolean not null default false;
