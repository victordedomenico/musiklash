import type { PrismaClient } from "@prisma/client";

const GENRE_TABLES = [
  "brackets",
  "tierlists",
  "blindtests",
  "stream_clashes",
  "smash_passes",
] as const;

let ensured: Promise<void> | null = null;

/** Ajoute la colonne genre si la DB n'a pas encore été migrée (cf. supabase/migrations/20260612000000_content_genres.sql). */
export function ensureGenreColumns(prisma: PrismaClient): Promise<void> {
  ensured ??= run(prisma).catch((e) => {
    ensured = null;
    console.error("[ensureGenreColumns]", e);
    throw e;
  });
  return ensured;
}

async function run(prisma: PrismaClient): Promise<void> {
  for (const table of GENRE_TABLES) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "genre" TEXT;`);
  }
}
