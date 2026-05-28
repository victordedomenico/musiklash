import type { PrismaClient } from "@prisma/client";

// No-op for animeklash — fresh DB always has the latest schema.
export async function ensureBattleFeatVisibilityColumns(_prisma: PrismaClient): Promise<void> {}
