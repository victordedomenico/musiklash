import "server-only";

import prisma from "@/lib/prisma";
import { buildBracketState, type BracketSize, type Pairing, type Vote } from "@/lib/bracket";
import { DEFAULT_TIERS } from "@/lib/tierlist-tiers";

export type RoomParticipant = { playerId: string; username: string };
export type BracketBallot = { playerId: string; winnerSeed: number | null };
export type TierlistBallot = { playerId: string; tierId: string | null };

export type BracketRoundResolution = {
  id: string;
  round: number;
  matchIndex: number;
  seedA: number;
  seedB: number;
  winnerSeed: number;
  votesA: number;
  votesB: number;
  skippedCount: number;
  tie: boolean;
  coinSide: "pile" | "face" | null;
  resolvedAt: string;
};

export type TierlistRoundResolution = {
  id: string;
  position: number;
  tierId: string;
  votesByTier: Record<string, number>;
  skippedCount: number;
  tie: boolean;
  coinSide: "pile" | "face" | null;
  pileTierId: string | null;
  faceTierId: string | null;
  resolvedAt: string;
};

export type CollaborativeTrack = {
  position: number;
  seed?: number;
  deezerTrackId: number;
  title: string;
  artist: string;
  coverUrl: string | null;
};

export type BracketRoomSnapshot = {
  id: string;
  hostId: string;
  hostName: string;
  previousHostId: string | null;
  status: "waiting" | "playing" | "paused" | "finished";
  participants: RoomParticipant[];
  votes: Vote[];
  ballots: BracketBallot[];
  lastResolution: BracketRoundResolution | null;
  duelStartedAt: string | null;
  winnerSeed: number | null;
  updatedAt: string;
  bracket: {
    id: string;
    title: string;
    size: number;
    drawVersion: number;
    tracks: CollaborativeTrack[];
  };
  currentPair: Pairing | null;
};

export type TierlistRoomSnapshot = {
  id: string;
  hostId: string;
  hostName: string;
  previousHostId: string | null;
  status: "waiting" | "playing" | "finished";
  participants: RoomParticipant[];
  placements: Record<string, string>;
  ballots: TierlistBallot[];
  lastResolution: TierlistRoundResolution | null;
  positionStartedAt: string | null;
  currentPosition: number;
  updatedAt: string;
  tierlist: { id: string; title: string; tracks: CollaborativeTrack[] };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizeParticipants(value: unknown): RoomParticipant[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  return value.flatMap((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry.playerId !== "string" ||
      typeof entry.username !== "string"
    ) {
      return [];
    }
    if (ids.has(entry.playerId)) return [];
    ids.add(entry.playerId);
    return [{ playerId: entry.playerId, username: entry.username.slice(0, 48) }];
  });
}

function getHostDisplayName(
  hostId: string,
  participants: RoomParticipant[],
  profileUsername: string,
): string {
  return (
    participants.find((participant) => participant.playerId === hostId)?.username ?? profileUsername
  );
}

export function normalizeVotes(value: unknown): Vote[] {
  if (!Array.isArray(value)) return [];
  const keys = new Set<string>();
  return value.flatMap((entry) => {
    if (
      !isRecord(entry) ||
      !Number.isInteger(entry.round) ||
      !Number.isInteger(entry.matchIndex) ||
      !Number.isInteger(entry.winnerSeed)
    ) {
      return [];
    }
    const vote = entry as unknown as Vote;
    const key = `${vote.round}:${vote.matchIndex}`;
    if (keys.has(key)) return [];
    keys.add(key);
    return [vote];
  });
}

export function normalizeBracketBallots(value: unknown): BracketBallot[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  return value.flatMap((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry.playerId !== "string" ||
      (entry.winnerSeed !== null && !Number.isInteger(entry.winnerSeed))
    ) {
      return [];
    }
    if (ids.has(entry.playerId)) return [];
    ids.add(entry.playerId);
    return [{ playerId: entry.playerId, winnerSeed: entry.winnerSeed as number | null }];
  });
}

export function normalizeBracketResolution(value: unknown): BracketRoundResolution | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== "string" ||
    !Number.isInteger(value.round) ||
    !Number.isInteger(value.matchIndex) ||
    !Number.isInteger(value.seedA) ||
    !Number.isInteger(value.seedB) ||
    !Number.isInteger(value.winnerSeed) ||
    !Number.isInteger(value.votesA) ||
    !Number.isInteger(value.votesB) ||
    typeof value.tie !== "boolean" ||
    (value.coinSide !== null && value.coinSide !== "pile" && value.coinSide !== "face") ||
    typeof value.resolvedAt !== "string"
  ) {
    return null;
  }
  return {
    ...(value as unknown as Omit<BracketRoundResolution, "skippedCount">),
    skippedCount: Number.isInteger(value.skippedCount) ? (value.skippedCount as number) : 0,
  };
}

export function normalizeTierlistBallots(value: unknown): TierlistBallot[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  const validTiers = new Set(DEFAULT_TIERS.map((tier) => tier.id));
  return value.flatMap((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry.playerId !== "string" ||
      (entry.tierId !== null && (typeof entry.tierId !== "string" || !validTiers.has(entry.tierId)))
    ) {
      return [];
    }
    if (ids.has(entry.playerId)) return [];
    ids.add(entry.playerId);
    return [{ playerId: entry.playerId, tierId: entry.tierId as string | null }];
  });
}

export function normalizeTierlistResolution(value: unknown): TierlistRoundResolution | null {
  if (!isRecord(value)) return null;
  const votesByTierValue = value.votesByTier;
  const validTiers = new Set(DEFAULT_TIERS.map((tier) => tier.id));
  if (
    typeof value.id !== "string" ||
    !Number.isInteger(value.position) ||
    typeof value.tierId !== "string" ||
    !validTiers.has(value.tierId) ||
    !isRecord(votesByTierValue) ||
    !Number.isInteger(value.skippedCount) ||
    typeof value.tie !== "boolean" ||
    (value.coinSide !== null && value.coinSide !== "pile" && value.coinSide !== "face") ||
    (value.pileTierId !== null &&
      (typeof value.pileTierId !== "string" || !validTiers.has(value.pileTierId))) ||
    (value.faceTierId !== null &&
      (typeof value.faceTierId !== "string" || !validTiers.has(value.faceTierId))) ||
    typeof value.resolvedAt !== "string"
  ) {
    return null;
  }
  const votesByTier = Object.fromEntries(
    DEFAULT_TIERS.map((tier) => [
      tier.id,
      Number.isInteger(votesByTierValue[tier.id]) ? (votesByTierValue[tier.id] as number) : 0,
    ]),
  );
  return {
    ...(value as unknown as Omit<TierlistRoundResolution, "votesByTier">),
    votesByTier,
  };
}

export function normalizePlacements(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  const validTiers = new Set(DEFAULT_TIERS.map((tier) => tier.id));
  return Object.fromEntries(
    Object.entries(value).flatMap(([position, tierId]) =>
      /^\d+$/.test(position) && typeof tierId === "string" && validTiers.has(tierId)
        ? [[position, tierId]]
        : [],
    ),
  );
}

type BracketRoomRaw = Awaited<ReturnType<typeof findBracketRoom>>;
async function findBracketRoom(roomId: string) {
  return prisma.bracketRoom.findUnique({
    where: { id: roomId },
    include: {
      host: { select: { username: true } },
      bracket: {
        select: {
          id: true,
          title: true,
          size: true,
          drawVersion: true,
          tracks: { orderBy: { seed: "asc" } },
        },
      },
    },
  });
}

export function toBracketRoomSnapshot(room: NonNullable<BracketRoomRaw>): BracketRoomSnapshot {
  const participants = normalizeParticipants(room.participants);
  const votes = normalizeVotes(room.votes);
  const tracks = room.bracket.tracks.map((track) => ({
    position: track.seed,
    seed: track.seed,
    deezerTrackId: Number(track.deezerTrackId),
    title: track.title,
    artist: track.artist,
    coverUrl: track.coverUrl,
  }));
  const state = buildBracketState(
    room.bracket.size as BracketSize,
    votes,
    tracks.length,
    room.bracket.drawVersion,
  );
  const round = state.rounds.length;
  const currentPair =
    state.rounds
      .at(-1)
      ?.find(
        (pair) =>
          pair.seedB <= tracks.length &&
          !votes.some((vote) => vote.round === round && vote.matchIndex === pair.matchIndex),
      ) ?? null;
  return {
    id: room.id,
    hostId: room.hostId,
    hostName: getHostDisplayName(room.hostId, participants, room.host.username),
    previousHostId: room.previousHostId,
    status: room.status as BracketRoomSnapshot["status"],
    participants,
    votes,
    ballots: normalizeBracketBallots(room.ballots),
    lastResolution: normalizeBracketResolution(room.lastResolution),
    duelStartedAt:
      (room.duelStartedAt ?? (room.status === "playing" ? room.updatedAt : null))?.toISOString() ??
      null,
    winnerSeed: room.winnerSeed,
    updatedAt: room.updatedAt.toISOString(),
    bracket: {
      id: room.bracket.id,
      title: room.bracket.title,
      size: room.bracket.size,
      drawVersion: room.bracket.drawVersion,
      tracks,
    },
    currentPair,
  };
}

export async function getBracketRoomSnapshot(roomId: string): Promise<BracketRoomSnapshot | null> {
  const room = await findBracketRoom(roomId);
  return room ? toBracketRoomSnapshot(room) : null;
}

type TierlistRoomRaw = Awaited<ReturnType<typeof findTierlistRoom>>;
async function findTierlistRoom(roomId: string) {
  return prisma.tierlistRoom.findUnique({
    where: { id: roomId },
    include: {
      host: { select: { username: true } },
      tierlist: { select: { id: true, title: true, tracks: { orderBy: { position: "asc" } } } },
    },
  });
}

export function toTierlistRoomSnapshot(room: NonNullable<TierlistRoomRaw>): TierlistRoomSnapshot {
  const participants = normalizeParticipants(room.participants);
  return {
    id: room.id,
    hostId: room.hostId,
    hostName: getHostDisplayName(room.hostId, participants, room.host.username),
    previousHostId: room.previousHostId,
    status: room.status as TierlistRoomSnapshot["status"],
    participants,
    placements: normalizePlacements(room.placements),
    ballots: normalizeTierlistBallots(room.ballots),
    lastResolution: normalizeTierlistResolution(room.lastResolution),
    positionStartedAt:
      (
        room.positionStartedAt ?? (room.status === "playing" ? room.updatedAt : null)
      )?.toISOString() ?? null,
    currentPosition: room.currentPosition,
    updatedAt: room.updatedAt.toISOString(),
    tierlist: {
      id: room.tierlist.id,
      title: room.tierlist.title,
      tracks: room.tierlist.tracks.map((track) => ({
        position: track.position,
        deezerTrackId: Number(track.deezerTrackId),
        title: track.title,
        artist: track.artist,
        coverUrl: track.coverUrl,
      })),
    },
  };
}

export async function getTierlistRoomSnapshot(
  roomId: string,
): Promise<TierlistRoomSnapshot | null> {
  const room = await findTierlistRoom(roomId);
  return room ? toTierlistRoomSnapshot(room) : null;
}
