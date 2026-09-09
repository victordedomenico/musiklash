ALTER TABLE public.blindtests
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'classic'
  CHECK (mode IN ('classic', 'flash'));

CREATE TABLE IF NOT EXISTS public.blindtest_flash_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blindtest_id uuid NOT NULL REFERENCES public.blindtests(id) ON DELETE CASCADE,
  player_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert', 'impossible')),
  listen_seconds double precision NOT NULL CHECK (listen_seconds IN (0.1, 0.5, 2, 8)),
  track_count smallint NOT NULL CHECK (track_count > 0),
  score integer NOT NULL DEFAULT 0,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blindtest_flash_sessions_blindtest_idx
  ON public.blindtest_flash_sessions(blindtest_id);
CREATE INDEX IF NOT EXISTS blindtest_flash_sessions_player_idx
  ON public.blindtest_flash_sessions(player_id);

ALTER TABLE public.blindtest_flash_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blindtest_flash_sessions_select_own" ON public.blindtest_flash_sessions
  FOR SELECT USING (player_id = auth.uid() OR player_id IS NULL);
CREATE POLICY "blindtest_flash_sessions_insert_own" ON public.blindtest_flash_sessions
  FOR INSERT WITH CHECK (player_id = auth.uid() OR player_id IS NULL);
