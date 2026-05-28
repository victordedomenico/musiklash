-- Tierlist tables (appliqué via `npm run db:reset` ou `npm run db:start`)

create table if not exists public.tierlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  theme text,
  visibility text not null check (visibility in ('private', 'public')) default 'private',
  cover_url text,
  created_at timestamptz default now()
);

create index if not exists tierlists_owner_idx on public.tierlists(owner_id);
create index if not exists tierlists_public_idx on public.tierlists(visibility, created_at desc);

create table if not exists public.tierlist_tracks (
  tierlist_id uuid not null references public.tierlists(id) on delete cascade,
  position smallint not null,
  deezer_track_id bigint not null,
  title text not null,
  artist text not null,
  preview_url text not null,
  cover_url text,
  primary key (tierlist_id, position)
);

-- placements: { "S+": [0,2], "S": [1], "A": [3], ... } — array of track positions per tier
create table if not exists public.tierlist_sessions (
  id uuid primary key default gen_random_uuid(),
  tierlist_id uuid not null references public.tierlists(id) on delete cascade,
  player_id uuid references public.profiles(id) on delete set null,
  placements jsonb not null default '{}',
  created_at timestamptz default now()
);

create index if not exists tierlist_sessions_tierlist_idx on public.tierlist_sessions(tierlist_id);

-- RLS
alter table public.tierlists enable row level security;
alter table public.tierlist_tracks enable row level security;
alter table public.tierlist_sessions enable row level security;

-- Tierlists: visible si public ou si owned
drop policy if exists "tierlists_select" on public.tierlists;
create policy "tierlists_select" on public.tierlists
  for select using (visibility = 'public' or owner_id = auth.uid());

drop policy if exists "tierlists_insert_own" on public.tierlists;
create policy "tierlists_insert_own" on public.tierlists
  for insert with check (owner_id = auth.uid());

drop policy if exists "tierlists_update_own" on public.tierlists;
create policy "tierlists_update_own" on public.tierlists
  for update using (owner_id = auth.uid());

drop policy if exists "tierlists_delete_own" on public.tierlists;
create policy "tierlists_delete_own" on public.tierlists
  for delete using (owner_id = auth.uid());

-- Tierlist tracks: hérite de la visibilité du parent
drop policy if exists "tierlist_tracks_select" on public.tierlist_tracks;
create policy "tierlist_tracks_select" on public.tierlist_tracks
  for select using (
    exists (
      select 1 from public.tierlists t
      where t.id = tierlist_tracks.tierlist_id
        and (t.visibility = 'public' or t.owner_id = auth.uid())
    )
  );

drop policy if exists "tierlist_tracks_insert_own" on public.tierlist_tracks;
create policy "tierlist_tracks_insert_own" on public.tierlist_tracks
  for insert with check (
    exists (
      select 1 from public.tierlists t
      where t.id = tierlist_tracks.tierlist_id and t.owner_id = auth.uid()
    )
  );

drop policy if exists "tierlist_tracks_delete_own" on public.tierlist_tracks;
create policy "tierlist_tracks_delete_own" on public.tierlist_tracks
  for delete using (
    exists (
      select 1 from public.tierlists t
      where t.id = tierlist_tracks.tierlist_id and t.owner_id = auth.uid()
    )
  );

-- Sessions: visible et modifiable par le joueur
drop policy if exists "tierlist_sessions_select_own" on public.tierlist_sessions;
create policy "tierlist_sessions_select_own" on public.tierlist_sessions
  for select using (
    player_id = auth.uid()
    or exists (
      select 1 from public.tierlists t
      where t.id = tierlist_sessions.tierlist_id and t.owner_id = auth.uid()
    )
  );

drop policy if exists "tierlist_sessions_insert_own" on public.tierlist_sessions;
create policy "tierlist_sessions_insert_own" on public.tierlist_sessions
  for insert with check (player_id = auth.uid() or player_id is null);
