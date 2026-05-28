import prisma from "@/lib/prisma";
import type { BattleFeatParticipant, BattleFeatRoomSnapshot, CharacterResult, FeatMove } from "@/lib/battle-feat";
import { popularityTier } from "@/lib/battle-feat";

// ─── AniList helpers ─────────────────────────────────────────────────────────

const ANILIST_URL = "https://graphql.anilist.co";

async function anilistQuery<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`AniList query failed: ${res.status}`);
  const json = await res.json() as { data: T; errors?: unknown[] };
  if (json.errors?.length) throw new Error(`AniList error: ${JSON.stringify(json.errors[0])}`);
  return json.data;
}

// Get the top anime a character appears in, plus that anime's top characters
const GET_CHARACTER_CONNECTIONS_QUERY = `
query GetCharConnections($id: Int!) {
  Character(id: $id) {
    id
    name { full }
    media(type: ANIME, perPage: 5, sort: POPULARITY_DESC) {
      nodes {
        id
        title { romaji english }
        popularity
      }
    }
  }
}`;

// Get top characters for an anime
const GET_MEDIA_CHARACTERS_QUERY = `
query GetMediaChars($id: Int!) {
  Media(id: $id, type: ANIME) {
    id
    title { romaji english }
    characters(perPage: 25, sort: [ROLE, FAVOURITES_DESC]) {
      nodes {
        id
        name { full }
        image { medium }
        favourites
      }
    }
  }
}`;

// Validate co-appearance in one batched query
const VALIDATE_CO_APPEARANCE_QUERY = `
query ValidateCoAppearance($charAId: Int!, $charBId: Int!) {
  charA: Character(id: $charAId) {
    media(type: ANIME, perPage: 20, sort: POPULARITY_DESC) {
      nodes { id title { romaji english } }
    }
  }
  charB: Character(id: $charBId) {
    media(type: ANIME, perPage: 20, sort: POPULARITY_DESC) {
      nodes { id }
    }
  }
}`;

// Get character by ID (for results page)
const GET_CHARACTER_BY_ID_QUERY = `
query GetChar($id: Int!) {
  Character(id: $id) {
    id
    name { full }
    image { medium large }
    favourites
  }
}`;

type AniListCharNode = { id: number; name: { full: string }; image: { medium: string | null }; favourites: number };

export type ConnectedCharacter = {
  id: string;
  name: string;
  pictureUrl: string | null;
  favourites: number;
  popularityTier: number;
  animeTitle: string | null;
};

function animeTitle(n: { title: { romaji: string; english: string | null } }): string {
  return n.title.english ?? n.title.romaji;
}

export async function getCharacterCoAppearances(characterId: string): Promise<ConnectedCharacter[]> {
  const charIdInt = parseInt(characterId, 10);
  if (!charIdInt) return [];

  const data = await anilistQuery<{
    Character: { media: { nodes: Array<{ id: number; title: { romaji: string; english: string | null }; popularity: number }> } };
  }>(GET_CHARACTER_CONNECTIONS_QUERY, { id: charIdInt });

  const topAnime = data.Character.media.nodes.slice(0, 3);
  if (topAnime.length === 0) return [];

  const results = await Promise.all(
    topAnime.map(async (anime) => {
      const mediaData = await anilistQuery<{
        Media: { id: number; title: { romaji: string; english: string | null }; characters: { nodes: AniListCharNode[] } };
      }>(GET_MEDIA_CHARACTERS_QUERY, { id: anime.id });
      return { anime, chars: mediaData.Media.characters.nodes };
    }),
  );

  const byId = new Map<string, ConnectedCharacter>();
  for (const { anime, chars } of results) {
    for (const c of chars) {
      const id = String(c.id);
      if (id === characterId) continue;
      if (!byId.has(id)) {
        byId.set(id, {
          id,
          name: c.name.full,
          pictureUrl: c.image.medium ?? null,
          favourites: c.favourites,
          popularityTier: popularityTier(c.favourites),
          animeTitle: animeTitle(anime),
        });
      }
    }
  }

  return [...byId.values()];
}

export async function validateCoAppearance(
  charAId: string,
  charBId: string,
): Promise<{ animeTitle: string } | null> {
  const aId = parseInt(charAId, 10);
  const bId = parseInt(charBId, 10);
  if (!aId || !bId || aId === bId) return null;

  const data = await anilistQuery<{
    charA: { media: { nodes: Array<{ id: number; title: { romaji: string; english: string | null } }> } };
    charB: { media: { nodes: Array<{ id: number }> } };
  }>(VALIDATE_CO_APPEARANCE_QUERY, { charAId: aId, charBId: bId });

  const bIds = new Set(data.charB.media.nodes.map((n) => n.id));
  const shared = data.charA.media.nodes.find((n) => bIds.has(n.id));
  if (!shared) return null;
  return { animeTitle: animeTitle(shared) };
}

export async function getCharacterById(characterId: string): Promise<CharacterResult | null> {
  const id = parseInt(characterId, 10);
  if (!id) return null;
  try {
    const data = await anilistQuery<{
      Character: AniListCharNode;
    }>(GET_CHARACTER_BY_ID_QUERY, { id });
    const c = data.Character;
    return {
      id: String(c.id),
      name: c.name.full,
      nameSlug: c.name.full.toLowerCase().replace(/[^a-z0-9]/g, ""),
      favourites: c.favourites,
      popularityTier: popularityTier(c.favourites),
      pictureUrl: c.image.medium ?? null,
    };
  } catch {
    return null;
  }
}

// ─── AI / Joker pick ──────────────────────────────────────────────────────────

export async function pickAiMove(
  currentCharId: string,
  difficulty: number,
  usedIds: string[],
): Promise<ConnectedCharacter | null> {
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
): Promise<ConnectedCharacter | null> {
  const candidates = await getCharacterCoAppearances(currentCharId);
  const available = candidates.filter((c) => !usedIds.includes(c.id));
  if (available.length === 0) return null;
  return available.sort((a, b) => b.favourites - a.favourites)[0] ?? null;
}

export async function getSoloEasyOptions(
  currentCharId: string,
  usedIds: string[],
  count = 4,
): Promise<ConnectedCharacter[]> {
  const candidates = await getCharacterCoAppearances(currentCharId);
  const available = candidates.filter((c) => !usedIds.includes(c.id));
  const popular = available.filter((c) => c.popularityTier <= 1);
  const source = popular.length >= 2 ? popular : available;
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
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
