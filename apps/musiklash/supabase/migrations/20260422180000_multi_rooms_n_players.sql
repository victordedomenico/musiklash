-- Blindtest et BattleFeat multi : support de 2 à N joueurs via une colonne
-- `participants` JSONB par room. On supprime les colonnes 1v1 dédiées
-- (guest_id, host_score, guest_score, jokers, ready, last_seen_at…) qui
-- partent dans l'array des participants.

-- ─── Blindtest rooms ─────────────────────────────────────────────────────────

drop policy if exists "blindtest_rooms_select" on public.blindtest_rooms;
drop policy if exists "blindtest_rooms_update" on public.blindtest_rooms;

alter table public.blindtest_rooms
  add column if not exists participants jsonb not null default '[]'::jsonb;

alter table public.blindtest_rooms drop column if exists guest_id;
alter table public.blindtest_rooms drop column if exists host_answers;
alter table public.blindtest_rooms drop column if exists guest_answers;
alter table public.blindtest_rooms drop column if exists host_score;
alter table public.blindtest_rooms drop column if exists guest_score;
alter table public.blindtest_rooms drop column if exists host_ready;
alter table public.blindtest_rooms drop column if exists guest_ready;
alter table public.blindtest_rooms drop column if exists host_last_seen_at;
alter table public.blindtest_rooms drop column if exists guest_last_seen_at;

create policy "blindtest_rooms_select" on public.blindtest_rooms
  for select using (
    host_id = auth.uid()
    or auth.uid() is not null
  );

create policy "blindtest_rooms_update" on public.blindtest_rooms
  for update using (
    host_id = auth.uid()
    or participants @> jsonb_build_array(jsonb_build_object('playerId', auth.uid()::text))
  );

-- ─── BattleFeat rooms ────────────────────────────────────────────────────────

drop policy if exists "rooms updatable by participants" on public.battle_feat_rooms;

alter table public.battle_feat_rooms
  add column if not exists participants jsonb not null default '[]'::jsonb;

alter table public.battle_feat_rooms drop column if exists guest_id;
alter table public.battle_feat_rooms drop column if exists host_score;
alter table public.battle_feat_rooms drop column if exists guest_score;
alter table public.battle_feat_rooms drop column if exists host_jokers;
alter table public.battle_feat_rooms drop column if exists guest_jokers;
alter table public.battle_feat_rooms drop column if exists host_last_seen_at;
alter table public.battle_feat_rooms drop column if exists guest_last_seen_at;

create policy "rooms updatable by participants" on public.battle_feat_rooms
  for update using (
    host_id = auth.uid()
    or participants @> jsonb_build_array(jsonb_build_object('playerId', auth.uid()::text))
  );
