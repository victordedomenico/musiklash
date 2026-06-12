import prisma from "@/lib/prisma";
import {
  normalizeParticipants,
  type StreamClashParticipant,
  type StreamClashPair,
  type StreamClashDifficulty,
  type StreamClashTrackData,
} from "@/lib/stream-clash";

export type { StreamClashParticipant, StreamClashPair };

// ─── Room snapshot ────────────────────────────────────────────────────────────

export type StreamClashRoomSnapshot = {
  id: string;
  streamClashId: string;
  hostId: string;
  hostName: string;
  visibility: "private" | "public";
  status: "waiting" | "playing" | "finished";
  difficulty: StreamClashDifficulty;
  currentRound: number;
  totalRounds: number;
  currentPair: StreamClashPair | null;
  pairStartedAt: string | null;
  participants: StreamClashParticipant[];
  winnerId: string | null;
  updatedAt: string;
  streamClash: {
    id: string;
    title: string;
    tracks: StreamClashTrackData[];
  };
};

// ─── Event types ──────────────────────────────────────────────────────────────

export type StreamClashRoomEvent =
  | { type: "player-joined"; playerId: string; username: string }
  | { type: "player-left"; playerId: string }
  | { type: "game-start" }
  | { type: "answer-submitted"; playerId: string }
  | { type: "next-round"; currentRound: number }
  | { type: "game-end"; winnerId: string | null }
  | { type: "rematch" };

export type StreamClashRoomBroadcastPayload = {
  room: StreamClashRoomSnapshot;
  event: StreamClashRoomEvent;
};

// ─── DB → snapshot ────────────────────────────────────────────────────────────

type RoomRaw = Awaited<ReturnType<typeof fetchRoomRaw>>;

async function fetchRoomRaw(roomId: string) {
  return prisma.streamClashRoom.findUnique({
    where: { id: roomId },
    include: {
      streamClash: {
        select: {
          id: true,
          title: true,
          tracks: { orderBy: { position: "asc" } },
        },
      },
      host: { select: { id: true, username: true } },
    },
  });
}

function normalizePair(value: unknown): StreamClashPair | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Record<string, unknown>;
  if (!p.trackA || !p.trackB) return null;
  return p as unknown as StreamClashPair;
}

export function toStreamClashRoomSnapshot(room: NonNullable<RoomRaw>): StreamClashRoomSnapshot {
  return {
    id: room.id,
    streamClashId: room.streamClashId,
    hostId: room.hostId,
    hostName: room.host.username,
    visibility: room.visibility === "public" ? "public" : "private",
    status: room.status as "waiting" | "playing" | "finished",
    difficulty: (room.difficulty as StreamClashDifficulty) ?? "easy",
    currentRound: room.currentRound,
    totalRounds: room.totalRounds,
    currentPair: normalizePair(room.currentPair),
    pairStartedAt: room.pairStartedAt?.toISOString() ?? null,
    participants: normalizeParticipants(room.participants),
    winnerId: room.winnerId,
    updatedAt: room.updatedAt.toISOString(),
    streamClash: {
      id: room.streamClash.id,
      title: room.streamClash.title,
      tracks: room.streamClash.tracks.map((t) => ({
        position: t.position,
        deezerTrackId: Number(t.deezerTrackId),
        title: t.title,
        artist: t.artist,
        coverUrl: t.coverUrl ?? null,
        rank: t.rank,
      })),
    },
  };
}

export async function getStreamClashRoomSnapshot(
  roomId: string,
): Promise<StreamClashRoomSnapshot | null> {
  const room = await fetchRoomRaw(roomId);
  if (!room) return null;
  return toStreamClashRoomSnapshot(room);
}
