-- Preserve historic fixed brackets while new brackets use dynamic rounds.
ALTER TABLE public.brackets
  ADD COLUMN draw_version SMALLINT NOT NULL DEFAULT 1;

ALTER TABLE public.brackets
  DROP CONSTRAINT IF EXISTS brackets_size_check;

ALTER TABLE public.brackets
  ADD CONSTRAINT brackets_size_check
  CHECK (size BETWEEN 3 AND 32767);

ALTER TABLE public.brackets
  ADD CONSTRAINT brackets_draw_version_check
  CHECK (draw_version IN (1, 2));
