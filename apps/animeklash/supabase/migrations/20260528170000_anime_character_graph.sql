-- BattleClash: cache AniList character co-appearances

CREATE TABLE IF NOT EXISTS anime_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_slug TEXT NOT NULL,
  popularity_tier SMALLINT NOT NULL DEFAULT 3,
  favourites INTEGER NOT NULL DEFAULT 0,
  picture_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS anime_characters_name_slug_idx ON anime_characters (name_slug);

CREATE TABLE IF NOT EXISTS character_coappearances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_a_id UUID NOT NULL REFERENCES anime_characters (id) ON DELETE CASCADE,
  character_b_id UUID NOT NULL REFERENCES anime_characters (id) ON DELETE CASCADE,
  anime_external_id TEXT,
  anime_title TEXT,
  UNIQUE (character_a_id, character_b_id, anime_external_id)
);

CREATE INDEX IF NOT EXISTS character_coappearances_a_idx ON character_coappearances (character_a_id);
CREATE INDEX IF NOT EXISTS character_coappearances_b_idx ON character_coappearances (character_b_id);
