-- Guarded no-op on fresh databases: `bracket_rooms` is created later.
-- Kept for local history compatibility after the column was added out of order.
DO $$
BEGIN
  IF to_regclass('public.bracket_rooms') IS NOT NULL THEN
    ALTER TABLE public.bracket_rooms
      ADD COLUMN IF NOT EXISTS last_resolution jsonb;
  END IF;
END $$;
