-- ─── blindtest_rooms ──────────────────────────────────────────────────────────
-- Multiplayer blindtest rooms (realtime sync via Supabase Realtime broadcast)

create table if not exists public.blindtest_rooms (
  id               uuid        primary key default gen_random_uuid(),
  blindtest_id     uuid        not null references public.blindtests(id) on delete cascade,
  host_id          uuid        not null references public.profiles(id)   on delete cascade,
  guest_id         uuid                    references public.profiles(id) on delete set null,
  status           text        not null default 'waiting',    -- waiting | playing | finished
  current_track    smallint    not null default 0,
  host_answers     jsonb       not null default '[]',
  guest_answers    jsonb       not null default '[]',
  host_score       integer     not null default 0,
  guest_score      integer     not null default 0,
  host_ready       boolean     not null default false,
  guest_ready      boolean     not null default false,
  winner_id        uuid,
  track_started_at timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists blindtest_rooms_host_idx      on public.blindtest_rooms (host_id);
create index if not exists blindtest_rooms_blindtest_idx on public.blindtest_rooms (blindtest_id);

-- ── auto-update updated_at ────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger blindtest_rooms_updated_at
  before update on public.blindtest_rooms
  for each row execute function public.set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.blindtest_rooms enable row level security;

-- Anyone can read a room they're part of (or publicly browsing)
create policy "blindtest_rooms_select" on public.blindtest_rooms
  for select using (
    host_id  = auth.uid()
    or guest_id = auth.uid()
    or auth.uid() is not null        -- authenticated users can see any room to join
  );

-- Only authenticated users can create a room
create policy "blindtest_rooms_insert" on public.blindtest_rooms
  for insert with check (host_id = auth.uid());

-- Participants can update the room (submit answers, change status, etc.)
create policy "blindtest_rooms_update" on public.blindtest_rooms
  for update using (
    host_id = auth.uid() or guest_id = auth.uid()
  );

-- ── Realtime ──────────────────────────────────────────────────────────────────

alter publication supabase_realtime add table public.blindtest_rooms;
