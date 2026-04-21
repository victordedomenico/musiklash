-- Presence heartbeat for multiplayer rooms (disconnect/reconnect handling)

alter table public.blindtest_rooms
  add column if not exists host_last_seen_at timestamptz default now(),
  add column if not exists guest_last_seen_at timestamptz;

update public.blindtest_rooms
set host_last_seen_at = coalesce(host_last_seen_at, created_at, now())
where host_last_seen_at is null;

alter table public.battle_feat_rooms
  add column if not exists host_last_seen_at timestamptz default now(),
  add column if not exists guest_last_seen_at timestamptz;

update public.battle_feat_rooms
set host_last_seen_at = coalesce(host_last_seen_at, created_at, now())
where host_last_seen_at is null;
