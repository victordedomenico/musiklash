-- Visibilité bibliothèque BattleFeat (aligné Prisma)

alter table public.battle_feat_solo_sessions
  add column if not exists visibility text not null default 'private'
  check (visibility in ('private', 'public'));

alter table public.battle_feat_rooms
  add column if not exists visibility text not null default 'private'
  check (visibility in ('private', 'public'));

create index if not exists bfss_visibility_created_idx
  on public.battle_feat_solo_sessions (visibility, created_at desc);

create index if not exists bfr_visibility_created_idx
  on public.battle_feat_rooms (visibility, created_at desc);
