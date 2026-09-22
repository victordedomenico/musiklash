-- Balanced dynamic brackets store draw_version = 3.
ALTER TABLE public.brackets
  DROP CONSTRAINT IF EXISTS brackets_draw_version_check;

ALTER TABLE public.brackets
  ADD CONSTRAINT brackets_draw_version_check
  CHECK (draw_version IN (1, 2, 3));
