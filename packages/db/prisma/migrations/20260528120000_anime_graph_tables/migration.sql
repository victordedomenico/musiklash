-- Shared Klash schema: AniList co-appearance cache (no-op if tables already exist).

CREATE TABLE IF NOT EXISTS "anime_characters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "external_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_slug" TEXT NOT NULL,
    "popularity_tier" SMALLINT NOT NULL DEFAULT 3,
    "favourites" INTEGER NOT NULL DEFAULT 0,
    "picture_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anime_characters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "anime_characters_external_id_key" ON "anime_characters"("external_id");
CREATE INDEX IF NOT EXISTS "anime_characters_name_slug_idx" ON "anime_characters"("name_slug");

CREATE TABLE IF NOT EXISTS "character_coappearances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "character_a_id" UUID NOT NULL,
    "character_b_id" UUID NOT NULL,
    "anime_external_id" TEXT,
    "anime_title" TEXT,

    CONSTRAINT "character_coappearances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "character_coappearances_character_a_id_character_b_id_anime_external_id_key"
ON "character_coappearances"("character_a_id", "character_b_id", "anime_external_id");
CREATE INDEX IF NOT EXISTS "character_coappearances_character_a_id_idx" ON "character_coappearances"("character_a_id");
CREATE INDEX IF NOT EXISTS "character_coappearances_character_b_id_idx" ON "character_coappearances"("character_b_id");

DO $$ BEGIN
  ALTER TABLE "character_coappearances" ADD CONSTRAINT "character_coappearances_character_a_id_fkey"
    FOREIGN KEY ("character_a_id") REFERENCES "anime_characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "character_coappearances" ADD CONSTRAINT "character_coappearances_character_b_id_fkey"
    FOREIGN KEY ("character_b_id") REFERENCES "anime_characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
