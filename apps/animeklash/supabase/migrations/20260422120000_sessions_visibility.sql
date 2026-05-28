-- Visibilité des résultats (sessions) pour bracket, tierlist et blindtest.
-- Aligné sur le schéma Prisma.

alter table public.bracket_games
  add column if not exists visibility text not null default 'private'
  check (visibility in ('private', 'public'));

alter table public.tierlist_sessions
  add column if not exists visibility text not null default 'private'
  check (visibility in ('private', 'public'));

alter table public.blindtest_sessions
  add column if not exists visibility text not null default 'private'
  check (visibility in ('private', 'public'));

create index if not exists bracket_games_visibility_created_idx
  on public.bracket_games (visibility, created_at desc);

create index if not exists tierlist_sessions_visibility_created_idx
  on public.tierlist_sessions (visibility, created_at desc);

create index if not exists blindtest_sessions_visibility_created_idx
  on public.blindtest_sessions (visibility, created_at desc);
