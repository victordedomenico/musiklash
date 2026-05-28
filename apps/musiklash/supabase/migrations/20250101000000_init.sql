-- Base schema: profiles, brackets, bracket_tracks, bracket_games, bracket_votes

-- ─── Enum ────────────────────────────────────────────────────────────────────

create type public.app_role as enum ('admin', 'moderator', 'user');

-- ─── Profiles ─────────────────────────────────────────────────────────────────

create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text unique not null,
  role       public.app_role not null default 'user',
  created_at timestamptz default now()
);

-- Auto-create a profile row on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    split_part(new.email, '@', 1)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

-- ─── Brackets ─────────────────────────────────────────────────────────────────

create table public.brackets (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  theme      text,
  size       smallint not null check (size in (4, 8, 16, 32)),
  visibility text not null check (visibility in ('private', 'public')) default 'private',
  cover_url  text,
  created_at timestamptz default now()
);

create index brackets_owner_idx  on public.brackets(owner_id);
create index brackets_public_idx on public.brackets(visibility, created_at desc);

alter table public.brackets enable row level security;

create policy "brackets_select" on public.brackets
  for select using (visibility = 'public' or owner_id = auth.uid());

create policy "brackets_insert_own" on public.brackets
  for insert with check (owner_id = auth.uid());

create policy "brackets_update_own" on public.brackets
  for update using (owner_id = auth.uid());

create policy "brackets_delete_own" on public.brackets
  for delete using (owner_id = auth.uid());

-- ─── Bracket Tracks ───────────────────────────────────────────────────────────

create table public.bracket_tracks (
  bracket_id      uuid not null references public.brackets(id) on delete cascade,
  seed            smallint not null,
  deezer_track_id bigint not null,
  title           text not null,
  artist          text not null,
  preview_url     text not null,
  cover_url       text,
  primary key (bracket_id, seed)
);

alter table public.bracket_tracks enable row level security;

create policy "bracket_tracks_select" on public.bracket_tracks
  for select using (
    exists (
      select 1 from public.brackets b
      where b.id = bracket_tracks.bracket_id
        and (b.visibility = 'public' or b.owner_id = auth.uid())
    )
  );

create policy "bracket_tracks_insert_own" on public.bracket_tracks
  for insert with check (
    exists (
      select 1 from public.brackets b
      where b.id = bracket_tracks.bracket_id and b.owner_id = auth.uid()
    )
  );

create policy "bracket_tracks_delete_own" on public.bracket_tracks
  for delete using (
    exists (
      select 1 from public.brackets b
      where b.id = bracket_tracks.bracket_id and b.owner_id = auth.uid()
    )
  );

-- ─── Bracket Games ────────────────────────────────────────────────────────────

create table public.bracket_games (
  id            uuid primary key default gen_random_uuid(),
  bracket_id    uuid not null references public.brackets(id) on delete cascade,
  player_id     uuid references public.profiles(id) on delete set null,
  current_round smallint not null default 1,
  winner_seed   smallint,
  created_at    timestamptz default now()
);

create index bracket_games_bracket_idx on public.bracket_games(bracket_id);
create index bracket_games_player_idx  on public.bracket_games(player_id);

alter table public.bracket_games enable row level security;

create policy "bracket_games_select_own" on public.bracket_games
  for select using (player_id = auth.uid() or player_id is null);

create policy "bracket_games_insert_own" on public.bracket_games
  for insert with check (player_id = auth.uid() or player_id is null);

create policy "bracket_games_update_own" on public.bracket_games
  for update using (player_id = auth.uid() or player_id is null);

-- ─── Bracket Votes ────────────────────────────────────────────────────────────

create table public.bracket_votes (
  game_id     uuid not null references public.bracket_games(id) on delete cascade,
  round       smallint not null,
  match_index smallint not null,
  winner_seed smallint not null,
  created_at  timestamptz default now(),
  primary key (game_id, round, match_index)
);

alter table public.bracket_votes enable row level security;

create policy "bracket_votes_select_own" on public.bracket_votes
  for select using (
    exists (
      select 1 from public.bracket_games g
      where g.id = bracket_votes.game_id
        and (g.player_id = auth.uid() or g.player_id is null)
    )
  );

create policy "bracket_votes_insert_own" on public.bracket_votes
  for insert with check (
    exists (
      select 1 from public.bracket_games g
      where g.id = bracket_votes.game_id
        and (g.player_id = auth.uid() or g.player_id is null)
    )
  );
