-- ─── rap_artists (optional cache, not required for gameplay) ─────────────────

create table if not exists public.rap_artists (
  id                uuid primary key default gen_random_uuid(),
  deezer_artist_id  bigint unique not null,
  name              text not null,
  name_slug         text not null,
  popularity_tier   smallint not null default 3,
  fan_count         int not null default 0,
  picture_url       text,
  created_at        timestamptz default now()
);

create index if not exists rap_artists_name_slug_idx on public.rap_artists (name_slug);
create index if not exists rap_artists_tier_idx on public.rap_artists (popularity_tier);

alter table public.rap_artists enable row level security;
create policy "rap_artists readable by all" on public.rap_artists
  for select using (true);

-- ─── rap_feats (optional cache) ───────────────────────────────────────────────

create table if not exists public.rap_feats (
  id               uuid primary key default gen_random_uuid(),
  artist_a_id      uuid not null references public.rap_artists(id) on delete cascade,
  artist_b_id      uuid not null references public.rap_artists(id) on delete cascade,
  track_deezer_id  bigint,
  track_title      text,
  unique (artist_a_id, artist_b_id, track_deezer_id)
);

create index if not exists rap_feats_a_idx on public.rap_feats (artist_a_id);
create index if not exists rap_feats_b_idx on public.rap_feats (artist_b_id);

alter table public.rap_feats enable row level security;
create policy "rap_feats readable by all" on public.rap_feats
  for select using (true);

-- ─── battle_feat_solo_sessions ────────────────────────────────────────────────

create table if not exists public.battle_feat_solo_sessions (
  id                  uuid primary key default gen_random_uuid(),
  player_id           uuid references public.profiles(id) on delete set null,
  difficulty          smallint not null,
  starting_artist_id  text not null,  -- Deezer artist ID (text)
  moves               jsonb not null default '[]',
  score               int not null default 0,
  jokers_used         int not null default 0,
  status              text not null default 'active',
  created_at          timestamptz default now()
);

create index if not exists bfss_player_idx on public.battle_feat_solo_sessions (player_id);
create index if not exists bfss_leaderboard_idx on public.battle_feat_solo_sessions (difficulty, score desc);

alter table public.battle_feat_solo_sessions enable row level security;
create policy "solo sessions readable by all" on public.battle_feat_solo_sessions
  for select using (true);
create policy "solo sessions insertable by anyone" on public.battle_feat_solo_sessions
  for insert with check (true);
create policy "solo sessions updatable by owner" on public.battle_feat_solo_sessions
  for update using (player_id = auth.uid() or player_id is null);

-- ─── battle_feat_rooms ────────────────────────────────────────────────────────

create table if not exists public.battle_feat_rooms (
  id                   uuid primary key default gen_random_uuid(),
  host_id              uuid not null references public.profiles(id) on delete cascade,
  guest_id             uuid references public.profiles(id) on delete set null,
  status               text not null default 'waiting',
  starting_artist_id   text,          -- Deezer artist ID (text)
  starting_artist_name text,
  starting_artist_pic  text,
  current_artist_id    text,          -- Deezer artist ID (text)
  current_artist_name  text,
  current_artist_pic   text,
  current_turn_id      uuid references public.profiles(id),
  used_artist_ids      jsonb not null default '[]',
  moves                jsonb not null default '[]',
  host_score           int not null default 0,
  guest_score          int not null default 0,
  host_jokers          int not null default 1,
  guest_jokers         int not null default 1,
  winner_id            uuid references public.profiles(id),
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

create index if not exists bfr_host_idx on public.battle_feat_rooms (host_id);

alter table public.battle_feat_rooms enable row level security;
create policy "rooms readable by all" on public.battle_feat_rooms
  for select using (true);
create policy "rooms insertable by authenticated" on public.battle_feat_rooms
  for insert with check (auth.uid() is not null);
create policy "rooms updatable by participants" on public.battle_feat_rooms
  for update using (host_id = auth.uid() or guest_id = auth.uid());

-- ─── Realtime ─────────────────────────────────────────────────────────────────

alter publication supabase_realtime add table public.battle_feat_rooms;
