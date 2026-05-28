-- Blindtest tables

create table public.blindtests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  visibility text not null check (visibility in ('private', 'public')) default 'private',
  created_at timestamptz default now()
);

create index blindtests_owner_idx on public.blindtests(owner_id);
create index blindtests_public_idx on public.blindtests(visibility, created_at desc);

create table public.blindtest_tracks (
  blindtest_id uuid not null references public.blindtests(id) on delete cascade,
  position smallint not null,
  deezer_track_id bigint not null,
  title text not null,
  artist text not null,
  preview_url text not null,
  cover_url text,
  primary key (blindtest_id, position)
);

-- answers: [{ position, guessTitle, guessArtist, correctTitle, correctArtist, points, trueTitle, trueArtist }]
create table public.blindtest_sessions (
  id uuid primary key default gen_random_uuid(),
  blindtest_id uuid not null references public.blindtests(id) on delete cascade,
  player_id uuid references public.profiles(id) on delete set null,
  score integer not null default 0,
  max_score integer not null default 0,
  answers jsonb not null default '[]',
  created_at timestamptz default now()
);

create index blindtest_sessions_idx on public.blindtest_sessions(blindtest_id);

-- RLS
alter table public.blindtests enable row level security;
alter table public.blindtest_tracks enable row level security;
alter table public.blindtest_sessions enable row level security;

create policy "blindtests_select" on public.blindtests
  for select using (visibility = 'public' or owner_id = auth.uid());
create policy "blindtests_insert_own" on public.blindtests
  for insert with check (owner_id = auth.uid());
create policy "blindtests_update_own" on public.blindtests
  for update using (owner_id = auth.uid());
create policy "blindtests_delete_own" on public.blindtests
  for delete using (owner_id = auth.uid());

create policy "blindtest_tracks_select" on public.blindtest_tracks
  for select using (
    exists (select 1 from public.blindtests b
      where b.id = blindtest_tracks.blindtest_id
        and (b.visibility = 'public' or b.owner_id = auth.uid()))
  );
create policy "blindtest_tracks_insert_own" on public.blindtest_tracks
  for insert with check (
    exists (select 1 from public.blindtests b
      where b.id = blindtest_tracks.blindtest_id and b.owner_id = auth.uid())
  );
create policy "blindtest_tracks_delete_own" on public.blindtest_tracks
  for delete using (
    exists (select 1 from public.blindtests b
      where b.id = blindtest_tracks.blindtest_id and b.owner_id = auth.uid())
  );

create policy "blindtest_sessions_select" on public.blindtest_sessions
  for select using (
    player_id = auth.uid() or player_id is null
    or exists (select 1 from public.blindtests b
      where b.id = blindtest_sessions.blindtest_id and b.owner_id = auth.uid())
  );
create policy "blindtest_sessions_insert" on public.blindtest_sessions
  for insert with check (player_id = auth.uid() or player_id is null);
