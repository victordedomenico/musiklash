-- Ajoute la notion de "challenge" BattleFeat solo : un challenge est une
-- création partageable (artiste de départ + difficulté). Les sessions
-- existantes restent "libres" et peuvent désormais référencer un challenge.

create table if not exists public.battle_feat_solo_challenges (
  id                    uuid primary key default gen_random_uuid(),
  owner_id              uuid not null references public.profiles(id) on delete cascade,
  title                 text not null,
  difficulty            smallint not null,
  starting_artist_id    text not null,          -- Deezer artist ID (text)
  starting_artist_name  text not null,
  starting_artist_pic   text,
  visibility            text not null default 'private',
  created_at            timestamptz not null default now()
);

create index if not exists bfsc_owner_idx
  on public.battle_feat_solo_challenges (owner_id);
create index if not exists bfsc_public_idx
  on public.battle_feat_solo_challenges (visibility, created_at desc);

alter table public.battle_feat_solo_challenges enable row level security;

create policy "bfsc readable if public or owner"
  on public.battle_feat_solo_challenges
  for select using (
    visibility = 'public'
    or owner_id = auth.uid()
  );

create policy "bfsc insertable by authenticated owner"
  on public.battle_feat_solo_challenges
  for insert with check (owner_id = auth.uid());

create policy "bfsc updatable by owner"
  on public.battle_feat_solo_challenges
  for update using (owner_id = auth.uid());

create policy "bfsc deletable by owner"
  on public.battle_feat_solo_challenges
  for delete using (owner_id = auth.uid());

-- Les sessions solo peuvent référencer un challenge (nullable pour les
-- sessions libres historiques).
alter table public.battle_feat_solo_sessions
  add column if not exists challenge_id uuid
    references public.battle_feat_solo_challenges(id) on delete set null;

create index if not exists bfss_challenge_idx
  on public.battle_feat_solo_sessions (challenge_id);
