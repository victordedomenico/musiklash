-- AlterTable
ALTER TABLE "battle_feat_solo_sessions" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'private';

-- AlterTable
ALTER TABLE "battle_feat_rooms" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'private';

CREATE INDEX "battle_feat_solo_sessions_visibility_created_at_idx" ON "battle_feat_solo_sessions"("visibility", "created_at" DESC);

CREATE INDEX "battle_feat_rooms_visibility_created_at_idx" ON "battle_feat_rooms"("visibility", "created_at" DESC);
