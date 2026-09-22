-- Add album column to bracket_tracks if it does not already exist
alter table public.bracket_tracks add column if not exists album text;
