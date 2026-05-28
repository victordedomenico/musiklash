-- Smash or Pass: decks, items, global stats, solo sessions, multiplayer rooms

create table if not exists public.smash_passes (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  item_type   text not null check (item_type in ('track', 'album', 'artist')),
  visibility  text not null default 'private',
  created_at  timestamptz not null default now()
);

create index if not exists sp_owner_idx on public.smash_passes (owner_id);
create index if not exists sp_public_idx on public.smash_passes (visibility, created_at desc);

alter table public.smash_passes enable row level security;

create policy "sp readable if public or owner"
  on public.smash_passes for select
  using (visibility = 'public' or owner_id = auth.uid());

create policy "sp insertable by authenticated owner"
  on public.smash_passes for insert
  with check (owner_id = auth.uid());

create policy "sp updatable by owner"
  on public.smash_passes for update
  using (owner_id = auth.uid());

create policy "sp deletable by owner"
  on public.smash_passes for delete
  using (owner_id = auth.uid());

-- ─── Items ────────────────────────────────────────────────────────────────────

create table if not exists public.smash_pass_items (
  smash_pass_id uuid not null references public.smash_passes(id) on delete cascade,
  position      smallint not null,
  external_id     bigint not null,
  title         text not null,
  subtitle      text,
  cover_url     text,
  preview_url   text,
  tags          jsonb not null default '[]',
  description   text,
  primary key (smash_pass_id, position)
);

alter table public.smash_pass_items enable row level security;

create policy "spi readable via parent"
  on public.smash_pass_items for select
  using (
    exists (
      select 1 from public.smash_passes sp
      where sp.id = smash_pass_id
        and (sp.visibility = 'public' or sp.owner_id = auth.uid())
    )
  );

create policy "spi insertable via parent owner"
  on public.smash_pass_items for insert
  with check (
    exists (
      select 1 from public.smash_passes sp
      where sp.id = smash_pass_id and sp.owner_id = auth.uid()
    )
  );

create policy "spi deletable via parent owner"
  on public.smash_pass_items for delete
  using (
    exists (
      select 1 from public.smash_passes sp
      where sp.id = smash_pass_id and sp.owner_id = auth.uid()
    )
  );

-- ─── Global community stats ───────────────────────────────────────────────────

create table if not exists public.smash_pass_item_stats (
  item_type    text not null check (item_type in ('track', 'album', 'artist')),
  external_id    bigint not null,
  smash_count  bigint not null default 0,
  pass_count   bigint not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (item_type, external_id)
);

alter table public.smash_pass_item_stats enable row level security;

create policy "spis readable by everyone"
  on public.smash_pass_item_stats for select
  using (true);

-- Inserts/updates only via service role (server actions)

-- ─── Solo sessions ────────────────────────────────────────────────────────────

create table if not exists public.smash_pass_sessions (
  id            uuid primary key default gen_random_uuid(),
  smash_pass_id uuid not null references public.smash_passes(id) on delete cascade,
  player_id     uuid references public.profiles(id) on delete set null,
  smash_count   integer not null default 0,
  pass_count    integer not null default 0,
  choices       jsonb not null default '[]',
  visibility    text not null default 'private',
  created_at    timestamptz not null default now()
);

create index if not exists sps_sp_idx on public.smash_pass_sessions (smash_pass_id);
create index if not exists sps_player_idx on public.smash_pass_sessions (player_id);
create index if not exists sps_public_idx on public.smash_pass_sessions (visibility, created_at desc);

alter table public.smash_pass_sessions enable row level security;

create policy "sps readable if public or owner"
  on public.smash_pass_sessions for select
  using (
    visibility = 'public'
    or player_id = auth.uid()
    or exists (
      select 1 from public.smash_passes sp
      where sp.id = smash_pass_id and sp.owner_id = auth.uid()
    )
  );

create policy "sps insertable by player"
  on public.smash_pass_sessions for insert
  with check (player_id = auth.uid() or player_id is null);

create policy "sps updatable by player"
  on public.smash_pass_sessions for update
  using (player_id = auth.uid() or player_id is null);

-- ─── Multiplayer rooms ────────────────────────────────────────────────────────

create table if not exists public.smash_pass_rooms (
  id                   uuid primary key default gen_random_uuid(),
  smash_pass_id        uuid not null references public.smash_passes(id) on delete cascade,
  host_id              uuid not null references public.profiles(id),
  status               text not null default 'waiting',
  visibility           text not null default 'private',
  current_position     smallint not null default 0,
  participants         jsonb not null default '[]',
  winner_id            uuid,
  position_started_at  timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists spr_host_idx on public.smash_pass_rooms (host_id);
create index if not exists spr_sp_idx on public.smash_pass_rooms (smash_pass_id);
create index if not exists spr_explore_idx on public.smash_pass_rooms (visibility, status, updated_at desc);

alter table public.smash_pass_rooms enable row level security;

create policy "spr readable if public or participant"
  on public.smash_pass_rooms for select
  using (
    visibility = 'public'
    or host_id = auth.uid()
    or participants::text like '%' || auth.uid()::text || '%'
  );

create policy "spr insertable by host"
  on public.smash_pass_rooms for insert
  with check (host_id = auth.uid());

create policy "spr updatable by host"
  on public.smash_pass_rooms for update
  using (host_id = auth.uid() or participants::text like '%' || auth.uid()::text || '%');
