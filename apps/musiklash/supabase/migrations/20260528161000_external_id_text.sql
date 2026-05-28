-- Phase 2: generic item ids as text (supports non-numeric providers).
-- Keep existing SQL column names for backward compatibility with @map.

ALTER TABLE bracket_tracks
  ALTER COLUMN deezer_track_id TYPE text USING deezer_track_id::text;

ALTER TABLE blindtest_tracks
  ALTER COLUMN deezer_track_id TYPE text USING deezer_track_id::text;

ALTER TABLE tierlist_tracks
  ALTER COLUMN deezer_track_id TYPE text USING deezer_track_id::text;

ALTER TABLE stream_clash_tracks
  ALTER COLUMN deezer_track_id TYPE text USING deezer_track_id::text;

ALTER TABLE smash_pass_items
  ALTER COLUMN deezer_id TYPE text USING deezer_id::text;

ALTER TABLE smash_pass_item_stats
  ALTER COLUMN deezer_id TYPE text USING deezer_id::text;
