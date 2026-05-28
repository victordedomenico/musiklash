import type { PrismaClient } from "@prisma/client";

/** Ajoute visibility sur les tables BattleFeat si la DB n’a pas encore été migrée (schémas sans historique Prisma complet). */
export async function ensureBattleFeatVisibilityColumns(prisma: PrismaClient): Promise<void> {
  try {
    const cols = await prisma.$queryRaw<{ solo: boolean; room: boolean }[]>`
      SELECT
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'battle_feat_solo_sessions'
            AND column_name = 'visibility'
        ) AS solo,
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'battle_feat_rooms'
            AND column_name = 'visibility'
        ) AS room;
    `;
    const row = cols[0];
    if (row?.solo && row?.room) return;

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "battle_feat_solo_sessions"
      ADD COLUMN IF NOT EXISTS "visibility" TEXT NOT NULL DEFAULT 'private';
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "battle_feat_rooms"
      ADD COLUMN IF NOT EXISTS "visibility" TEXT NOT NULL DEFAULT 'private';
    `);
  } catch (e) {
    console.error("[ensureBattleFeatVisibilityColumns]", e);
    throw e;
  }
}
