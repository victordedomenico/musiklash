import prisma from "@/lib/prisma";
import type { BattleFeatParticipant, BattleFeatRoomSnapshot, FeatMove } from "@/lib/battle-feat";
import { parseFeatArtists, slugifyName, popularityTier } from "@/lib/battle-feat";
import { getArtistTopTracks, searchArtists, searchTracks } from "@/lib/deezer";

type ConnectedArtist = {
  id: string;
  name: string;
  pictureUrl: string | null;
  fanCount: number;
  popularityTier: number;
  trackTitle: string | null;
};

const SOLO_AI_POOL_BY_DIFFICULTY: Record<number, number> = {
  1: 165,
  2: 673,
  3: 994,
};
const SOLO_AI_POOL_MAX = SOLO_AI_POOL_BY_DIFFICULTY[3];
const SOLO_AI_POOL_CACHE_TTL_MS = 5 * 60 * 1000;

let soloAiPoolCache:
  | {
      updatedAt: number;
      idsByDifficulty: Record<number, Set<string>>;
    }
  | null = null;

function normalizeMoves(moves: unknown): FeatMove[] {
  return Array.isArray(moves) ? (moves as FeatMove[]) : [];
}

function normalizeUsedArtistIds(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function difficultyMaxTier(difficulty: number): number {
  if (difficulty <= 1) return 1;
  if (difficulty === 2) return 2;
  return 3;
}

export async function validateFeatLink(prevArtistId: string, nextArtistId: string) {
  if (!prevArtistId || !nextArtistId || prevArtistId === nextArtistId) {
    return null;
  }

  return prisma.rapFeat.findFirst({
    where: {
      OR: [
        { artistAId: prevArtistId, artistBId: nextArtistId },
        { artistAId: nextArtistId, artistBId: prevArtistId },
      ],
    },
    select: { trackTitle: true },
  });
}

export async function getConnectedArtists(currentArtistId: string): Promise<ConnectedArtist[]> {
  const feats = await prisma.rapFeat.findMany({
    where: {
      OR: [{ artistAId: currentArtistId }, { artistBId: currentArtistId }],
    },
    select: {
      artistA: {
        select: {
          id: true,
          name: true,
          pictureUrl: true,
          fanCount: true,
          popularityTier: true,
        },
      },
      artistB: {
        select: {
          id: true,
          name: true,
          pictureUrl: true,
          fanCount: true,
          popularityTier: true,
        },
      },
      trackTitle: true,
    },
  });

  const byArtist = new Map<string, ConnectedArtist>();

  for (const feat of feats) {
    const candidate = feat.artistA.id === currentArtistId ? feat.artistB : feat.artistA;
    if (candidate.id === currentArtistId) continue;

    const existing = byArtist.get(candidate.id);
    if (!existing) {
      byArtist.set(candidate.id, {
        id: candidate.id,
        name: candidate.name,
        pictureUrl: candidate.pictureUrl,
        fanCount: candidate.fanCount,
        popularityTier: candidate.popularityTier,
        trackTitle: feat.trackTitle ?? null,
      });
      continue;
    }

    if (!existing.trackTitle && feat.trackTitle) {
      existing.trackTitle = feat.trackTitle;
    }
    if (candidate.fanCount > existing.fanCount) {
      existing.fanCount = candidate.fanCount;
      existing.popularityTier = candidate.popularityTier;
      existing.pictureUrl = candidate.pictureUrl;
    }
  }

  return [...byArtist.values()];
}

export async function pickAiMove(
  currentArtistId: string,
  difficulty: number,
  usedIds: string[],
): Promise<ConnectedArtist | null> {
  const candidates = await getConnectedArtists(currentArtistId);
  const available = candidates.filter(
    (artist) =>
      !usedIds.includes(artist.id) &&
      artist.popularityTier <= difficultyMaxTier(difficulty),
  );

  if (available.length === 0) return null;

  return available[Math.floor(Math.random() * available.length)] ?? null;
}

export async function pickJokerMove(currentArtistId: string, usedIds: string[]) {
  const candidates = await getConnectedArtists(currentArtistId);

  return (
    candidates
      .filter((artist) => !usedIds.includes(artist.id))
      .sort((a, b) => b.fanCount - a.fanCount)[0] ?? null
  );
}

export function canClaimTurnTimeout(updatedAt: Date, turnSeconds: number, toleranceSeconds = 2) {
  const elapsedMs = Date.now() - updatedAt.getTime();
  return elapsedMs >= Math.max(0, turnSeconds - toleranceSeconds) * 1000;
}

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

/**
 * Return the next active (non-eliminated) participant after the given player
 * in round-robin order. Returns null if no other active players remain.
 */
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

export async function getBattleFeatRoomSnapshot(
  roomId: string,
): Promise<BattleFeatRoomSnapshot | null> {
  const room = await prisma.battleFeatRoom.findUnique({
    where: { id: roomId },
    include: {
      host: { select: { username: true } },
    },
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

// ─── Deezer-based game logic (no DB required) ─────────────────────────────────

type DeezerArtistMove = {
  id: string;
  name: string;
  pictureUrl: string | null;
  fanCount: number;
  popularityTier: number;
  trackTitle: string | null;
  previewUrl: string | null;
};

function normalizePreviewUrl(previewUrl: string | null | undefined): string | null {
  if (!previewUrl || previewUrl.length === 0) return null;
  return previewUrl.replace(/^http:\/\//i, "https://");
}

function shuffle<T>(values: T[]): T[] {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

function dedupeByArtistId(candidates: DeezerArtistMove[]): DeezerArtistMove[] {
  const byId = new Map<string, DeezerArtistMove>();
  for (const candidate of candidates) {
    const existing = byId.get(candidate.id);
    if (!existing || candidate.fanCount > existing.fanCount) {
      byId.set(candidate.id, candidate);
    }
  }
  return [...byId.values()];
}

async function getSoloAiPoolIdsForDifficulty(difficulty: number): Promise<Set<string> | null> {
  if (difficulty < 1 || difficulty > 3) return null;
  const now = Date.now();
  if (soloAiPoolCache && now - soloAiPoolCache.updatedAt < SOLO_AI_POOL_CACHE_TTL_MS) {
    return soloAiPoolCache.idsByDifficulty[difficulty] ?? null;
  }

  const artists = await prisma.rapArtist.findMany({
    select: { deezerArtistId: true, fanCount: true },
    orderBy: [{ fanCount: "desc" }, { name: "asc" }],
    take: SOLO_AI_POOL_MAX,
  });
  if (artists.length === 0) return null;

  const orderedIds = artists.map((artist) => String(artist.deezerArtistId));
  soloAiPoolCache = {
    updatedAt: now,
    idsByDifficulty: {
      1: new Set(orderedIds.slice(0, SOLO_AI_POOL_BY_DIFFICULTY[1])),
      2: new Set(orderedIds.slice(0, SOLO_AI_POOL_BY_DIFFICULTY[2])),
      3: new Set(orderedIds.slice(0, SOLO_AI_POOL_BY_DIFFICULTY[3])),
    },
  };

  return soloAiPoolCache.idsByDifficulty[difficulty] ?? null;
}

function applySoloAiPoolFilter(
  candidates: DeezerArtistMove[],
  allowedIds: Set<string> | null,
): DeezerArtistMove[] {
  if (!allowedIds) return candidates;
  return candidates.filter((candidate) => allowedIds.has(candidate.id));
}

function pickByDifficulty(
  candidates: DeezerArtistMove[],
  difficulty: number,
): DeezerArtistMove | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const byFansAsc = [...candidates].sort((a, b) => a.fanCount - b.fanCount);
  const bucketSize = Math.max(1, Math.ceil(byFansAsc.length / 3));

  if (difficulty <= 1) {
    // Easy: bias toward mainstream artists (high fan count).
    const mainstream = byFansAsc.slice(-bucketSize);
    return mainstream[Math.floor(Math.random() * mainstream.length)] ?? mainstream[0] ?? null;
  }

  if (difficulty >= 3) {
    // Hard: bias toward less-known artists (low fan count).
    const underground = byFansAsc.slice(0, bucketSize);
    return underground[Math.floor(Math.random() * underground.length)] ?? underground[0] ?? null;
  }

  // Normal: keep broad variety.
  return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
}

type FeatCandidate = {
  slug: string;
  name: string;
  artistId: string | null;
  trackTitle: string;
  previewUrl: string | null;
};

async function getFeatCandidates(artistId: string): Promise<FeatCandidate[]> {
  const tracks = await getArtistTopTracks(Number(artistId), 50, { requirePreview: false });
  const seen = new Map<string, string>();
  const out: FeatCandidate[] = [];
  for (const track of tracks) {
    for (const featName of parseFeatArtists(track.title)) {
      const slug = slugifyName(featName);
      if (!slug || seen.has(slug)) continue;
      seen.set(slug, track.title);
      out.push({
        slug,
        name: featName,
        artistId: null,
        trackTitle: track.title,
        previewUrl: normalizePreviewUrl(track.preview),
      });
    }
    // Deezer often lists collaborations in contributors instead of the title.
    for (const contributor of track.contributors ?? []) {
      const contributorId = String(contributor.id);
      if (!contributorId || contributorId === artistId) continue;
      const slug = slugifyName(contributor.name);
      if (!slug || seen.has(slug)) continue;
      seen.set(slug, track.title);
      out.push({
        slug,
        name: contributor.name,
        artistId: contributorId,
        trackTitle: track.title,
        previewUrl: normalizePreviewUrl(track.preview),
      });
    }
  }
  return out;
}

async function resolveDeezerMovesFromCandidates(
  candidates: FeatCandidate[],
  usedIds: string[],
  searchLimit = 12,
): Promise<DeezerArtistMove[]> {
  const toSearch = candidates.slice(0, searchLimit);
  const results = await Promise.all(
    toSearch.map(async ({ name, slug, artistId, trackTitle, previewUrl }) => {
      if (artistId && !usedIds.includes(artistId)) {
        try {
          const artistHits = await searchArtists(name, 5);
          const artistMatch = artistHits.find((a) => String(a.id) === artistId);
          if (artistMatch) {
            const tier = popularityTier(artistMatch.nb_fan ?? 0);
            return {
              id: String(artistMatch.id),
              name: artistMatch.name,
              pictureUrl: artistMatch.picture_medium ?? artistMatch.picture_small ?? null,
              fanCount: artistMatch.nb_fan ?? 0,
              popularityTier: tier,
              trackTitle,
              previewUrl,
            };
          }
        } catch {
          // fallback to slug matching below
        }
      }
      try {
        const hits = await searchArtists(name, 3);
        const match = hits.find((a) => slugifyName(a.name) === slug) ?? hits[0];
        if (!match) return null;
        if (usedIds.includes(String(match.id))) return null;
        const tier = popularityTier(match.nb_fan ?? 0);
        return {
          id: String(match.id),
          name: match.name,
          pictureUrl: match.picture_medium ?? match.picture_small ?? null,
          fanCount: match.nb_fan ?? 0,
          popularityTier: tier,
          trackTitle,
          previewUrl,
        };
      } catch {
        return null;
      }
    }),
  );

  return dedupeByArtistId(results.filter(Boolean) as DeezerArtistMove[]);
}

export async function validateFeatLinkDeezer(
  prevArtistId: string,
  nextArtistName: string,
): Promise<{ trackTitle: string | null } | null> {
  const nextSlug = slugifyName(nextArtistName);
  const candidates = await getFeatCandidates(prevArtistId);
  const hit = candidates.find((c) => c.slug === nextSlug);
  if (hit) return { trackTitle: hit.trackTitle };

  // Also try from the other direction if we have the next artist's ID (passed via nextArtistId)
  return null;
}

export async function validateFeatLinkDeezerBidirectional(
  prevArtistId: string,
  prevArtistName: string,
  nextArtistId: string,
  nextArtistName: string,
): Promise<{ trackTitle: string | null; previewUrl: string | null } | null> {
  const nextSlug = slugifyName(nextArtistName);
  const prevSlug = slugifyName(prevArtistName);

  // 1) Check prev artist's top tracks for next artist
  const prevCandidates = await getFeatCandidates(prevArtistId);
  const fwdHit = prevCandidates.find((c) => c.slug === nextSlug);
  if (fwdHit) return { trackTitle: fwdHit.trackTitle, previewUrl: fwdHit.previewUrl };

  // 2) Check next artist's top tracks for prev artist
  const nextCandidates = await getFeatCandidates(nextArtistId);
  const revHit = nextCandidates.find((c) => c.slug === prevSlug);
  if (revHit) return { trackTitle: revHit.trackTitle, previewUrl: revHit.previewUrl };

  // 3) Fallback: direct Deezer track search (catches hits outside top 50)
  const queries = [
    `${prevArtistName} ${nextArtistName}`,
    `${nextArtistName} ${prevArtistName}`,
  ];
  for (const q of queries) {
    try {
      const tracks = await searchTracks(q, 20, { requirePreview: false });
      for (const track of tracks) {
        const mainSlug = slugifyName(track.artist.name);
        const titleFeatSlugs = parseFeatArtists(track.title).map(slugifyName);
        const contributorSlugs = (track.contributors ?? []).map((c) => slugifyName(c.name));
        const linkedSlugs = [...titleFeatSlugs, ...contributorSlugs];
        const hasPrev = mainSlug === prevSlug || linkedSlugs.includes(prevSlug);
        const hasNext = mainSlug === nextSlug || linkedSlugs.includes(nextSlug);
        if (hasPrev && hasNext) {
          return {
            trackTitle: track.title,
            previewUrl: normalizePreviewUrl(track.preview),
          };
        }
      }
    } catch {
      // ignore search errors — fallback is best-effort
    }
  }

  return null;
}

export async function pickAiMoveDeezer(
  currentArtistId: string,
  difficulty: number,
  usedIds: string[],
): Promise<DeezerArtistMove | null> {
  const candidates = await getFeatCandidates(currentArtistId);
  if (candidates.length === 0) return null;

  const valid = await resolveDeezerMovesFromCandidates(candidates, usedIds, 18);
  if (valid.length === 0) return null;

  const allowedIds = await getSoloAiPoolIdsForDifficulty(difficulty);
  const scoped = applySoloAiPoolFilter(valid, allowedIds);
  if (scoped.length === 0) return null;

  return pickByDifficulty(scoped, difficulty);
}

export async function pickJokerMoveDeezer(
  currentArtistId: string,
  usedIds: string[],
): Promise<DeezerArtistMove | null> {
  const candidates = await getFeatCandidates(currentArtistId);
  if (candidates.length === 0) return null;

  const valid = await resolveDeezerMovesFromCandidates(candidates, usedIds, 18);
  if (valid.length === 0) return null;
  // Return most popular
  return valid.sort((a, b) => b.fanCount - a.fanCount)[0];
}

export async function getSoloEasyOptionsDeezer(
  currentArtistId: string,
  usedIds: string[],
  optionCount = 4,
): Promise<DeezerArtistMove[]> {
  const candidates = await getFeatCandidates(currentArtistId);
  if (candidates.length === 0) return [];

  const valid = await resolveDeezerMovesFromCandidates(candidates, usedIds, 20);
  if (valid.length === 0) return [];

  const easyPoolIds = await getSoloAiPoolIdsForDifficulty(1);
  const scoped = applySoloAiPoolFilter(valid, easyPoolIds);
  if (scoped.length === 0) return [];

  const mainstream = scoped.filter((artist) => artist.popularityTier <= 1);
  const source = mainstream.length > 0 ? mainstream : scoped;
  return shuffle(source).slice(0, Math.max(1, optionCount));
}
