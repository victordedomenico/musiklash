-- Visibilité des rooms blindtest multi : privé (lien) ou public (explorer + lien)

alter table public.blindtest_rooms
  add column if not exists visibility text not null default 'private'
  check (visibility in ('private', 'public'));

create index if not exists blindtest_rooms_visibility_status_updated_idx
  on public.blindtest_rooms (visibility, status, updated_at desc);
