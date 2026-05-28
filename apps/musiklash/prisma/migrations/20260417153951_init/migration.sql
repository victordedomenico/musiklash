-- CreateEnum
CREATE TYPE "app_role" AS ENUM ('admin', 'moderator', 'user');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "role" "app_role" NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brackets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "theme" TEXT,
    "size" SMALLINT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "cover_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brackets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bracket_tracks" (
    "bracket_id" UUID NOT NULL,
    "seed" SMALLINT NOT NULL,
    "deezer_track_id" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "preview_url" TEXT NOT NULL,
    "cover_url" TEXT,

    CONSTRAINT "bracket_tracks_pkey" PRIMARY KEY ("bracket_id","seed")
);

-- CreateTable
CREATE TABLE "bracket_games" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bracket_id" UUID NOT NULL,
    "player_id" UUID,
    "current_round" SMALLINT NOT NULL DEFAULT 1,
    "winner_seed" SMALLINT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bracket_games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bracket_votes" (
    "game_id" UUID NOT NULL,
    "round" SMALLINT NOT NULL,
    "match_index" SMALLINT NOT NULL,
    "winner_seed" SMALLINT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bracket_votes_pkey" PRIMARY KEY ("game_id","round","match_index")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_username_key" ON "profiles"("username");

-- CreateIndex
CREATE INDEX "brackets_owner_id_idx" ON "brackets"("owner_id");

-- CreateIndex
CREATE INDEX "brackets_visibility_created_at_idx" ON "brackets"("visibility", "created_at" DESC);

-- CreateIndex
CREATE INDEX "bracket_games_bracket_id_idx" ON "bracket_games"("bracket_id");

-- CreateIndex
CREATE INDEX "bracket_games_player_id_idx" ON "bracket_games"("player_id");

-- AddForeignKey
ALTER TABLE "brackets" ADD CONSTRAINT "brackets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bracket_tracks" ADD CONSTRAINT "bracket_tracks_bracket_id_fkey" FOREIGN KEY ("bracket_id") REFERENCES "brackets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bracket_games" ADD CONSTRAINT "bracket_games_bracket_id_fkey" FOREIGN KEY ("bracket_id") REFERENCES "brackets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bracket_games" ADD CONSTRAINT "bracket_games_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bracket_votes" ADD CONSTRAINT "bracket_votes_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "bracket_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hack pour la Shadow Database de Prisma
DO $$
BEGIN
  CREATE SCHEMA IF NOT EXISTS "auth";
  CREATE TABLE IF NOT EXISTS "auth"."users" (
      "id" UUID PRIMARY KEY,
      "email" TEXT
  );
EXCEPTION WHEN OTHERS THEN
  -- Do nothing in real DB
END $$;

-- Trigger pour simuler ON DELETE CASCADE
CREATE OR REPLACE FUNCTION public.handle_deleted_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.profiles WHERE id = old.id;
  RETURN old;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_deleted_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer
SET search_path = public
AS $$
DECLARE
  base_username text;
  candidate text;
  suffix int := 0;
BEGIN
  base_username := coalesce(split_part(new.email, '@', 1), 'user');
  candidate := base_username;
  WHILE exists (select 1 from public.profiles where username = candidate) LOOP
    suffix := suffix + 1;
    candidate := base_username || suffix::text;
  END LOOP;

  INSERT INTO public.profiles (id, username, role) VALUES (new.id, candidate, 'user');
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
