-- Add source + metadata to all item tables.
-- Column renames (external_id → external_id, external_id → external_id) are
-- handled via Prisma @map so no SQL rename is needed — the old SQL names stay.

ALTER TABLE bracket_tracks
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'anilist',
  ADD COLUMN IF NOT EXISTS metadata jsonb;

ALTER TABLE blindtest_tracks
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'anilist',
  ADD COLUMN IF NOT EXISTS metadata jsonb;

ALTER TABLE tierlist_tracks
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'anilist',
  ADD COLUMN IF NOT EXISTS metadata jsonb;

ALTER TABLE stream_clash_tracks
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'anilist',
  ADD COLUMN IF NOT EXISTS metadata jsonb;

ALTER TABLE smash_pass_items
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'anilist',
  ADD COLUMN IF NOT EXISTS metadata jsonb;

ALTER TABLE smash_pass_item_stats
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'anilist';
