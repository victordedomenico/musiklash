import "server-only";

import type { ContentEntity } from "@klash/content-adapter";
import type { PrismaClient } from "@prisma/client";
import { createRelationGraph } from "../relation-graph";

export type RelatedEntityMove = {
  id: string;
  name: string;
  pictureUrl: string | null;
  fanCount: number;
  popularityTier: number;
  trackTitle: string | null;
};

export function popularityTierFromFanCount(fanCount: number): number {
  if (fanCount >= 500_000) return 1;
  if (fanCount >= 50_000) return 2;
  return 3;
}

function entityToRelated(entity: ContentEntity): RelatedEntityMove {
  const fanCount = entity.fanCount ?? 0;
  const meta = entity.metadata ?? {};
  const trackTitle =
    typeof meta.trackTitle === "string"
      ? meta.trackTitle
      : typeof meta.animeTitle === "string"
        ? meta.animeTitle
        : null;
  return {
    id: entity.id,
    name: entity.name,
    pictureUrl: entity.pictureUrl ?? null,
    fanCount,
    popularityTier: popularityTierFromFanCount(fanCount),
    trackTitle,
  };
}

export function getBattleFeatGraph(prisma: PrismaClient) {
  const graph = createRelationGraph(prisma);
  if (!graph) {
    throw new Error("BattleFeat relation graph is not configured for this vertical");
  }
  return graph;
}

export async function getRelatedEntitiesForBattleFeat(
  prisma: PrismaClient,
  entityId: string,
): Promise<RelatedEntityMove[]> {
  const graph = getBattleFeatGraph(prisma);
  const entities = await graph.getRelatedEntities(entityId);
  return entities.map(entityToRelated);
}

export async function validateBattleFeatLink(
  prisma: PrismaClient,
  fromEntityId: string,
  toEntityId: string,
): Promise<{ trackTitle: string | null } | null> {
  const graph = getBattleFeatGraph(prisma);
  const result = await graph.validateLink(fromEntityId, toEntityId);
  if (!result.valid) return null;
  return { trackTitle: result.viaItemId ?? null };
}

export async function getBattleFeatOptions(
  prisma: PrismaClient,
  entityId: string,
  limit?: number,
): Promise<RelatedEntityMove[]> {
  const graph = getBattleFeatGraph(prisma);
  const entities = await graph.getOptions(entityId, limit != null ? { limit } : undefined);
  return entities.map(entityToRelated);
}

// ─── AI / joker / easy-options helpers ────────────────────────────────────────

function difficultyMaxTier(difficulty: number): number {
  if (difficulty <= 1) return 1;
  if (difficulty === 2) return 2;
  return 3;
}

/**
 * Pick a random entity for the AI at a given difficulty.
 * Difficulty controls the popularity tier ceiling (1 = mainstream only, 3 = any).
 */
export async function pickAiMoveForBattleFeat(
  prisma: PrismaClient,
  entityId: string,
  difficulty: number,
  usedIds: string[],
): Promise<RelatedEntityMove | null> {
  const candidates = await getRelatedEntitiesForBattleFeat(prisma, entityId);
  const available = candidates.filter(
    (e) => !usedIds.includes(e.id) && e.popularityTier <= difficultyMaxTier(difficulty),
  );
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)] ?? null;
}

/**
 * Joker move: always picks the most popular unused entity.
 */
export async function pickJokerMoveForBattleFeat(
  prisma: PrismaClient,
  entityId: string,
  usedIds: string[],
): Promise<RelatedEntityMove | null> {
  const candidates = await getRelatedEntitiesForBattleFeat(prisma, entityId);
  return (
    candidates
      .filter((e) => !usedIds.includes(e.id))
      .sort((a, b) => b.fanCount - a.fanCount)[0] ?? null
  );
}

/**
 * Easy-mode options: small set of popular, unused entities.
 */
export async function getSoloEasyOptionsForBattleFeat(
  prisma: PrismaClient,
  entityId: string,
  usedIds: string[],
  count = 4,
): Promise<RelatedEntityMove[]> {
  const candidates = await getRelatedEntitiesForBattleFeat(prisma, entityId);
  const available = candidates.filter((e) => !usedIds.includes(e.id));
  const popular = available.filter((e) => e.popularityTier <= 1);
  const source = popular.length >= 2 ? popular : available;
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.max(1, count));
}
