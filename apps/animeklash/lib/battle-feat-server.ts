import {
  getRelatedEntitiesForBattleFeat,
  validateBattleFeatLink,
} from "@klash/klash-app/lib/battle-feat/graph-helpers";
import { cacheCoAppearances } from "@klash/relation-graph";
import {
  fetchCharacterCoAppearances,
  getCharacterById as getAniListCharacterById,
  type ConnectedCharacter,
} from "@klash/content-adapter";
import prisma from "@/lib/prisma";
import type { CharacterResult } from "@/lib/battle-feat";
import { popularityTier } from "@/lib/battle-feat";

export type { ConnectedCharacter };

function toConnectedWithTier(c: ConnectedCharacter): ConnectedCharacter & { popularityTier: number } {
  return {
    ...c,
    popularityTier: popularityTier(c.favourites),
  };
}

async function getSourceCharacterMeta(characterId: string) {
  const cached = await prisma.animeCharacter.findUnique({
    where: { externalId: characterId },
    select: { name: true, favourites: true, pictureUrl: true },
  });
  if (cached) {
    return {
      name: cached.name,
      favourites: cached.favourites,
      pictureUrl: cached.pictureUrl,
    };
  }
  const live = await getAniListCharacterById(parseInt(characterId, 10));
  if (!live) return null;
  return {
    name: live.name.full,
    favourites: live.favourites,
    pictureUrl: live.image.medium ?? live.image.large ?? null,
  };
}

export async function getCharacterCoAppearances(
  characterId: string,
): Promise<(ConnectedCharacter & { popularityTier: number })[]> {
  const related = await getRelatedEntitiesForBattleFeat(prisma, characterId);
  return related.map((r) =>
    toConnectedWithTier({
      id: r.id,
      name: r.name,
      pictureUrl: r.pictureUrl,
      favourites: r.fanCount,
      animeTitle: r.trackTitle ?? "",
    }),
  );
}

export async function validateCoAppearance(
  charAId: string,
  charBId: string,
): Promise<{ animeTitle: string } | null> {
  const result = await validateBattleFeatLink(prisma, charAId, charBId);
  if (!result) return null;
  return { animeTitle: result.trackTitle ?? "" };
}

export async function getCharacterById(characterId: string): Promise<CharacterResult | null> {
  const cached = await prisma.animeCharacter.findUnique({
    where: { externalId: characterId },
  });
  if (cached) {
    return {
      id: cached.externalId,
      name: cached.name,
      nameSlug: cached.nameSlug,
      favourites: cached.favourites,
      popularityTier: cached.popularityTier,
      pictureUrl: cached.pictureUrl,
    };
  }

  const id = parseInt(characterId, 10);
  if (!id) return null;
  const c = await getAniListCharacterById(id);
  if (!c) return null;
  return {
    id: String(c.id),
    name: c.name.full,
    nameSlug: c.name.full.toLowerCase().replace(/[^a-z0-9]/g, ""),
    favourites: c.favourites,
    popularityTier: popularityTier(c.favourites),
    pictureUrl: c.image.medium ?? c.image.large ?? null,
  };
}

export async function pickAiMove(
  currentCharId: string,
  difficulty: number,
  usedIds: string[],
): Promise<(ConnectedCharacter & { popularityTier: number }) | null> {
  const candidates = await getCharacterCoAppearances(currentCharId);
  const available = candidates.filter(
    (c) =>
      !usedIds.includes(c.id) &&
      (difficulty >= 3 || c.popularityTier <= (difficulty === 1 ? 1 : 2)),
  );
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)] ?? null;
}

export async function pickJokerMove(
  currentCharId: string,
  usedIds: string[],
): Promise<(ConnectedCharacter & { popularityTier: number }) | null> {
  const candidates = await getCharacterCoAppearances(currentCharId);
  const available = candidates.filter((c) => !usedIds.includes(c.id));
  if (available.length === 0) return null;
  return available.sort((a, b) => b.favourites - a.favourites)[0] ?? null;
}

export async function getSoloEasyOptions(
  currentCharId: string,
  usedIds: string[],
  count = 4,
): Promise<(ConnectedCharacter & { popularityTier: number })[]> {
  const candidates = await getCharacterCoAppearances(currentCharId);
  const available = candidates.filter((c) => !usedIds.includes(c.id));
  const popular = available.filter((c) => c.popularityTier <= 1);
  const source = popular.length >= 2 ? popular : available;
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/** Précharge le graphe pour un personnage (seed / warmup). */
export async function warmCharacterGraph(characterId: string) {
  const meta = await getSourceCharacterMeta(characterId);
  if (!meta) return 0;
  const live = await fetchCharacterCoAppearances(characterId);
  if (live.length === 0) return 0;
  await cacheCoAppearances(
    prisma,
    characterId,
    meta.name,
    meta.favourites,
    meta.pictureUrl,
    live,
  );
  return live.length;
}

export {
  normalizeUsedArtistIds,
  normalizeBattleFeatParticipants,
  findBattleFeatParticipant,
  nextActiveParticipant,
  canClaimTurnTimeout,
} from "@klash/klash-app/lib/battle-feat/shared";
import { getBattleFeatRoomSnapshot as getRoomSnapshot } from "@klash/klash-app/lib/battle-feat/room-snapshot";

export async function getBattleFeatRoomSnapshot(roomId: string) {
  return getRoomSnapshot(prisma, roomId);
}
