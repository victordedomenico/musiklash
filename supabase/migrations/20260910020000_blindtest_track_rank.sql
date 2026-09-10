ALTER TABLE public.blindtest_tracks
  ADD COLUMN IF NOT EXISTS rank integer NOT NULL DEFAULT 0;
