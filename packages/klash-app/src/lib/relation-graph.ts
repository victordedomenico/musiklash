import type { RelationGraph } from "@klash/klash-config";
import { getCurrentVertical } from "@klash/klash-config";
import {
  createAnilistRelationGraph,
  createDeezerRelationGraph,
} from "@klash/relation-graph";
import type { PrismaClient } from "@prisma/client";

/** Instantiate the vertical's relation graph, or null when battle-feat is disabled. */
export function createRelationGraph(prisma: PrismaClient): RelationGraph | null {
  const { relationGraph } = getCurrentVertical();
  if (relationGraph === "deezer") return createDeezerRelationGraph(prisma);
  if (relationGraph === "anilist") return createAnilistRelationGraph(prisma);
  return null;
}
