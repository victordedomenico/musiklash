-- Allow larger bracket sizes for big playlists (up to 128).
ALTER TABLE public.brackets
  DROP CONSTRAINT IF EXISTS brackets_size_check;

ALTER TABLE public.brackets
  ADD CONSTRAINT brackets_size_check
  CHECK (size IN (4, 8, 16, 32, 64, 128));
