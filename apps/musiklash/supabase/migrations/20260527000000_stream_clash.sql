-- Stream Clash : contenu (stream_clashes + stream_clash_tracks),
-- sessions solo (stream_clash_sessions) et rooms multijoueur
-- (stream_clash_rooms — remplace la table provisoire sans FK).

-- ─── Contenu ──────────────────────────────────────────────────────────────────

create table if not exists public.stream_clashes (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  visibility  text not null default 'private',
  created_at  timestamptz not null default now()
);

create index if not exists sc_owner_idx
  on public.stream_clashes (owner_id);
create index if not exists sc_public_idx
  on public.stream_clashes (visibility, created_at desc);

alter table public.stream_clashes enable row level security;

create policy "sc readable if public or owner"
  on public.stream_clashes for select
  using (visibility = 'public' or owner_id = auth.uid());

create policy "sc insertable by authenticated owner"
  on public.stream_clashes for insert
  with check (owner_id = auth.uid());

create policy "sc updatable by owner"
  on public.stream_clashes for update
  using (owner_id = auth.uid());

create policy "sc deletable by owner"
  on public.stream_clashes for delete
  using (owner_id = auth.uid());

-- ─── Pistes ───────────────────────────────────────────────────────────────────

create table if not exists public.stream_clash_tracks (
  stream_clash_id uuid not null references public.stream_clashes(id) on delete cascade,
  position        smallint not null,
  deezer_track_id bigint not null,
  title           text not null,
  artist          text not null,
  preview_url     text not null,
  cover_url       text,
  rank            integer not null default 0,
  primary key (stream_clash_id, position)
);

alter table public.stream_clash_tracks enable row level security;

create policy "sct readable via parent"
  on public.stream_clash_tracks for select
  using (
    exists (
      select 1 from public.stream_clashes sc
      where sc.id = stream_clash_id
        and (sc.visibility = 'public' or sc.owner_id = auth.uid())
    )
  );

create policy "sct insertable via parent owner"
  on public.stream_clash_tracks for insert
  with check (
    exists (
      select 1 from public.stream_clashes sc
      where sc.id = stream_clash_id and sc.owner_id = auth.uid()
    )
  );

create policy "sct deletable via parent owner"
  on public.stream_clash_tracks for delete
  using (
    exists (
      select 1 from public.stream_clashes sc
      where sc.id = stream_clash_id and sc.owner_id = auth.uid()
    )
  );

-- ─── Sessions solo ────────────────────────────────────────────────────────────

create table if not exists public.stream_clash_sessions (
  id                uuid primary key default gen_random_uuid(),
  stream_clash_id   uuid not null references public.stream_clashes(id) on delete cascade,
  player_id         uuid references public.profiles(id) on delete set null,
  difficulty        text not null default 'easy',
  score             integer not null default 0,
  total_rounds      integer not null default 0,
  rounds            jsonb not null default '[]',
  visibility        text not null default 'private',
  created_at        timestamptz not null default now()
);

create index if not exists scs_sc_idx    on public.stream_clash_sessions (stream_clash_id);
create index if not exists scs_player_idx on public.stream_clash_sessions (player_id);
create index if not exists scs_public_idx on public.stream_clash_sessions (visibility, created_at desc);

alter table public.stream_clash_sessions enable row level security;

create policy "scs readable if public or owner"
  on public.stream_clash_sessions for select
  using (visibility = 'public' or player_id = auth.uid());

create policy "scs insertable by anyone"
  on public.stream_clash_sessions for insert
  with check (true);

create policy "scs updatable by owner"
  on public.stream_clash_sessions for update
  using (player_id = auth.uid() or player_id is null);

-- ─── Rooms multijoueur ────────────────────────────────────────────────────────
-- Recrée la table (elle était vide / non migrée avant ce script).

drop table if exists public.stream_clash_rooms;

create table public.stream_clash_rooms (
  id                uuid primary key default gen_random_uuid(),
  stream_clash_id   uuid not null references public.stream_clashes(id) on delete cascade,
  host_id           uuid not null references public.profiles(id),
  status            text not null default 'waiting',  -- waiting | playing | finished
  visibility        text not null default 'private',
  difficulty        text not null default 'easy',     -- easy | normal | hard
  current_round     smallint not null default 0,
  total_rounds      smallint not null default 10,
  current_pair      jsonb,
  pair_started_at   timestamptz,
  participants      jsonb not null default '[]',
  winner_id         uuid,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists scr_host_idx
  on public.stream_clash_rooms (host_id);
create index if not exists scr_sc_idx
  on public.stream_clash_rooms (stream_clash_id);
create index if not exists scr_public_idx
  on public.stream_clash_rooms (visibility, status, updated_at desc);

alter table public.stream_clash_rooms enable row level security;

create policy "scr readable if public or host"
  on public.stream_clash_rooms for select
  using (visibility = 'public' or host_id = auth.uid());

create policy "scr insertable by authenticated host"
  on public.stream_clash_rooms for insert
  with check (host_id = auth.uid());

create policy "scr updatable by anyone (game actions)"
  on public.stream_clash_rooms for update
  using (true);
