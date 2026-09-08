-- Allow larger brackets for extensive playlists (up to 512 tracks).
ALTER TABLE public.brackets
  DROP CONSTRAINT IF EXISTS brackets_size_check;

ALTER TABLE public.brackets
  ADD CONSTRAINT brackets_size_check
  CHECK (size IN (4, 8, 16, 32, 64, 128, 256, 512));
