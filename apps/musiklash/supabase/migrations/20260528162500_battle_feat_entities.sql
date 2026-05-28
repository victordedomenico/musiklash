-- Phase 2: Battle-Feat generic entities.
-- Keep table names and column names for compatibility with Prisma @map.

ALTER TABLE rap_artists
  ALTER COLUMN deezer_artist_id TYPE text USING deezer_artist_id::text;

ALTER TABLE rap_artists
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'artist';

ALTER TABLE rap_feats
  ALTER COLUMN track_deezer_id TYPE text USING track_deezer_id::text;
