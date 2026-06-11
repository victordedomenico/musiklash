-- Blindtest: classement mondial multijoueur (un enregistrement par joueur)
-- Agrège les scores de toutes les parties multijoueurs, tous blindtests confondus.

create table if not exists public.blindtest_leaderboard (
  player_id     uuid primary key references public.profiles(id) on delete cascade,
  username      text not null,
  best_score    integer not null default 0,
  total_score   bigint  not null default 0,
  games_played  integer not null default 0,
  best_at       timestamptz,
  updated_at    timestamptz not null default now()
);

create index if not exists btl_best_idx on public.blindtest_leaderboard (best_score desc);

alter table public.blindtest_leaderboard enable row level security;

-- Lecture publique (affichage du classement). Les écritures passent par les
-- server actions (Prisma / service role) qui contournent la RLS.
create policy "btl readable by everyone"
  on public.blindtest_leaderboard for select
  using (true);
