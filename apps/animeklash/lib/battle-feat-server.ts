import prisma from "@/lib/prisma";
import type { BattleFeatParticipant, BattleFeatRoomSnapshot, CharacterResult, FeatMove } from "@/lib/battle-feat";
import { popularityTier } from "@/lib/battle-feat";
import {
  fetchCharacterCoAppearances,
  getCharacterById as getAniListCharacterById,
  validateCharacterCoAppearance,
  type ConnectedCharacter,
} from "@klash/content-adapter";
import {
  cacheCoAppearances,
  findCachedCoappearance,
  getCachedCoAppearances,
  resolveCoAppearances,
} from "@/lib/battle-feat-graph";

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

export async function getCharacterCoAppearances(characterId: string): Promise<(ConnectedCharacter & { popularityTier: number })[]> {
  const meta = await getSourceCharacterMeta(characterId);
  if (!meta) {
    const live = await fetchCharacterCoAppearances(characterId);
    return live.map(toConnectedWithTier);
  }

  const resolved = await resolveCoAppearances(
    characterId,
    meta.name,
    meta.favourites,
    meta.pictureUrl,
    () => fetchCharacterCoAppearances(characterId),
  );
  return resolved.map(toConnectedWithTier);
}

export async function validateCoAppearance(
  charAId: string,
  charBId: string,
): Promise<{ animeTitle: string } | null> {
  const cached = await findCachedCoappearance(charAId, charBId);
  if (cached) return cached;

  const result = await validateCharacterCoAppearance(charAId, charBId);
  if (!result) return null;

  const [aMeta, bMeta] = await Promise.all([
    getSourceCharacterMeta(charAId),
    getSourceCharacterMeta(charBId),
  ]);
  if (aMeta && bMeta) {
    await cacheCoAppearances(charAId, aMeta.name, aMeta.favourites, aMeta.pictureUrl, [
      {
        id: charBId,
        name: bMeta.name,
        pictureUrl: bMeta.pictureUrl,
        favourites: bMeta.favourites,
        animeTitle: result.animeTitle,
      },
    ]);
    await cacheCoAppearances(charBId, bMeta.name, bMeta.favourites, bMeta.pictureUrl, [
      {
        id: charAId,
        name: aMeta.name,
        pictureUrl: aMeta.pictureUrl,
        favourites: aMeta.favourites,
        animeTitle: result.animeTitle,
      },
    ]);
  }

  return result;
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

// ─── AI / Joker pick ──────────────────────────────────────────────────────────

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
  await cacheCoAppearances(characterId, meta.name, meta.favourites, meta.pictureUrl, live);
  return live.length;
}

// ─── Normalizers shared with room actions ────────────────────────────────────

function normalizeMoves(moves: unknown): FeatMove[] {
  return Array.isArray(moves) ? (moves as FeatMove[]) : [];
}

function normalizeUsedArtistIds(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((e): e is string => typeof e === "string")
    : [];
}

export { normalizeUsedArtistIds };

export function normalizeBattleFeatParticipants(value: unknown): BattleFeatParticipant[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((p): p is Record<string, unknown> => typeof p === "object" && p !== null)
    .map((p, i) => ({
      playerId: typeof p.playerId === "string" ? p.playerId : "",
      username: typeof p.username === "string" ? p.username : "Joueur",
      score: typeof p.score === "number" ? p.score : 0,
      jokers: typeof p.jokers === "number" ? p.jokers : 1,
      eliminated: typeof p.eliminated === "boolean" ? p.eliminated : false,
      position: typeof p.position === "number" ? p.position : i,
      lastSeenAt: typeof p.lastSeenAt === "string" ? p.lastSeenAt : null,
      joinedAt: typeof p.joinedAt === "string" ? p.joinedAt : new Date().toISOString(),
    }))
    .filter((p) => p.playerId.length > 0)
    .sort((a, b) => a.position - b.position);
}

export function findBattleFeatParticipant(
  participants: BattleFeatParticipant[],
  playerId: string,
): BattleFeatParticipant | null {
  return participants.find((p) => p.playerId === playerId) ?? null;
}

export function nextActiveParticipant(
  participants: BattleFeatParticipant[],
  currentPlayerId: string,
): BattleFeatParticipant | null {
  const active = participants.filter((p) => !p.eliminated);
  if (active.length === 0) return null;
  if (active.length === 1) return active[0];
  const idx = active.findIndex((p) => p.playerId === currentPlayerId);
  if (idx === -1) return active[0];
  return active[(idx + 1) % active.length];
}

export function canClaimTurnTimeout(updatedAt: Date, turnSeconds: number, toleranceSeconds = 2) {
  const elapsedMs = Date.now() - updatedAt.getTime();
  return elapsedMs >= Math.max(0, turnSeconds - toleranceSeconds) * 1000;
}

export async function getBattleFeatRoomSnapshot(
  roomId: string,
): Promise<BattleFeatRoomSnapshot | null> {
  const room = await prisma.battleFeatRoom.findUnique({
    where: { id: roomId },
    include: { host: { select: { username: true } } },
  });
  if (!room) return null;
  return {
    id: room.id,
    hostId: room.hostId,
    hostUsername: room.host.username,
    status: room.status,
    startingArtistId: room.startingArtistId,
    startingArtistName: room.startingArtistName,
    startingArtistPic: room.startingArtistPic,
    currentArtistId: room.currentArtistId,
    currentArtistName: room.currentArtistName,
    currentArtistPic: room.currentArtistPic,
    currentTurnId: room.currentTurnId,
    usedArtistIds: normalizeUsedArtistIds(room.usedArtistIds),
    moves: normalizeMoves(room.moves),
    participants: normalizeBattleFeatParticipants(room.participants),
    winnerId: room.winnerId,
    updatedAt: room.updatedAt.toISOString(),
  };
}
