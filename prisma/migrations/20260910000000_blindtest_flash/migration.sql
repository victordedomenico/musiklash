ALTER TABLE "blindtests"
  ADD COLUMN IF NOT EXISTS "mode" TEXT NOT NULL DEFAULT 'classic';

CREATE TABLE IF NOT EXISTS "blindtest_flash_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "blindtest_id" UUID NOT NULL,
  "player_id" UUID,
  "difficulty" TEXT NOT NULL,
  "listen_seconds" DOUBLE PRECISION NOT NULL,
  "track_count" SMALLINT NOT NULL,
  "score" INTEGER NOT NULL DEFAULT 0,
  "answers" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "blindtest_flash_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "blindtest_flash_sessions_blindtest_id_idx"
  ON "blindtest_flash_sessions"("blindtest_id");
CREATE INDEX IF NOT EXISTS "blindtest_flash_sessions_player_id_idx"
  ON "blindtest_flash_sessions"("player_id");

ALTER TABLE "blindtest_flash_sessions"
  ADD CONSTRAINT "blindtest_flash_sessions_blindtest_id_fkey"
  FOREIGN KEY ("blindtest_id") REFERENCES "blindtests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "blindtest_flash_sessions"
  ADD CONSTRAINT "blindtest_flash_sessions_player_id_fkey"
  FOREIGN KEY ("player_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
