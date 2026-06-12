-- AlterTable
ALTER TABLE "brackets" ADD COLUMN IF NOT EXISTS "genre" TEXT;
ALTER TABLE "tierlists" ADD COLUMN IF NOT EXISTS "genre" TEXT;
ALTER TABLE "blindtests" ADD COLUMN IF NOT EXISTS "genre" TEXT;
ALTER TABLE "stream_clashes" ADD COLUMN IF NOT EXISTS "genre" TEXT;
ALTER TABLE "smash_passes" ADD COLUMN IF NOT EXISTS "genre" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "brackets_genre_idx" ON "brackets"("genre") WHERE "genre" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "tierlists_genre_idx" ON "tierlists"("genre") WHERE "genre" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "blindtests_genre_idx" ON "blindtests"("genre") WHERE "genre" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "stream_clashes_genre_idx" ON "stream_clashes"("genre") WHERE "genre" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "smash_passes_genre_idx" ON "smash_passes"("genre") WHERE "genre" IS NOT NULL;
