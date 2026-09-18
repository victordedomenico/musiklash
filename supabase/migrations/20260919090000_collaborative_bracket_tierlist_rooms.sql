-- Collaborative rooms are separate from solo sessions: a room is the shared
-- authority for votes, while local solo progress remains local-only.
create table public.bracket_rooms (
  id uuid primary key default gen_random_uuid(),
  bracket_id uuid not null references public.brackets(id) on delete cascade,
  host_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  participants jsonb not null default '[]'::jsonb,
  votes jsonb not null default '[]'::jsonb,
  ballots jsonb not null default '[]'::jsonb,
  winner_seed smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bracket_rooms_bracket_idx on public.bracket_rooms (bracket_id);
create index bracket_rooms_host_idx on public.bracket_rooms (host_id);

create table public.tierlist_rooms (
  id uuid primary key default gen_random_uuid(),
  tierlist_id uuid not null references public.tierlists(id) on delete cascade,
  host_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  current_position smallint not null default 0,
  participants jsonb not null default '[]'::jsonb,
  placements jsonb not null default '{}'::jsonb,
  ballots jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tierlist_rooms_tierlist_idx on public.tierlist_rooms (tierlist_id);
create index tierlist_rooms_host_idx on public.tierlist_rooms (host_id);

create trigger bracket_rooms_updated_at
  before update on public.bracket_rooms
  for each row execute function public.set_updated_at();

create trigger tierlist_rooms_updated_at
  before update on public.tierlist_rooms
  for each row execute function public.set_updated_at();

alter table public.bracket_rooms enable row level security;
alter table public.tierlist_rooms enable row level security;

create policy "bracket rooms readable by authenticated users" on public.bracket_rooms
  for select using (auth.uid() is not null);
create policy "tierlist rooms readable by authenticated users" on public.tierlist_rooms
  for select using (auth.uid() is not null);

-- Server Actions use the service role/database connection for mutations. The
-- client only receives typed snapshots and never writes room state directly.
