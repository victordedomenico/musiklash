import prisma from "@/lib/prisma";
import type { BlindtestAnswer, BlindtrackData } from "@/components/BlindtestGame";

export type { BlindtestAnswer, BlindtrackData };

// ─── Participant model ────────────────────────────────────────────────────────

export type BlindtestParticipant = {
  playerId: string;
  username: string;
  score: number;
  answers: BlindtestAnswer[];
  lastSeenAt: string | null; // ISO
  joinedAt: string; // ISO
};

// ─── Room snapshot ────────────────────────────────────────────────────────────

export type BlindtestRoomSnapshot = {
  id: string;
  blindtestId: string;
  hostId: string;
  hostName: string;
  visibility: "private" | "public";
  status: "waiting" | "playing" | "finished";
  currentTrack: number;
  participants: BlindtestParticipant[];
  winnerId: string | null;
  updatedAt: string;
  trackStartedAt: string | null;
  blindtest: {
    id: string;
    title: string;
    tracks: BlindtrackData[];
  };
};

// ─── Event types (broadcast payload) ─────────────────────────────────────────

export type BlindtestRoomEvent =
  | { type: "player-joined"; playerId: string; username: string }
  | { type: "player-left"; playerId: string }
  | { type: "game-start" }
  | { type: "answer-submitted"; playerId: string }
  | { type: "next-track"; currentTrack: number }
  | { type: "game-end"; winnerId: string | null }
  | { type: "rematch" };

export type BlindtestRoomBroadcastPayload = {
  room: BlindtestRoomSnapshot;
  event: BlindtestRoomEvent;
};

// ─── Scoring helpers ──────────────────────────────────────────────────────────

export { normalize, isCorrect, isSingleArtistBlindtest } from "./blindtest-utils";

export const POINTS_TITLE = 2;
export const POINTS_ARTIST = 1;

// ─── Participants helpers ────────────────────────────────────────────────────

export function normalizeParticipants(value: unknown): BlindtestParticipant[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((p): p is Record<string, unknown> => typeof p === "object" && p !== null)
    .map((p) => ({
      playerId: typeof p.playerId === "string" ? p.playerId : "",
      username: typeof p.username === "string" ? p.username : "Joueur",
      score: typeof p.score === "number" ? p.score : 0,
      answers: Array.isArray(p.answers) ? (p.answers as BlindtestAnswer[]) : [],
      lastSeenAt: typeof p.lastSeenAt === "string" ? p.lastSeenAt : null,
      joinedAt: typeof p.joinedAt === "string" ? p.joinedAt : new Date().toISOString(),
    }))
    .filter((p) => p.playerId.length > 0);
}

export function findParticipant(
  participants: BlindtestParticipant[],
  playerId: string,
): BlindtestParticipant | null {
  return participants.find((p) => p.playerId === playerId) ?? null;
}

export function computeWinner(participants: BlindtestParticipant[]): string | null {
  if (participants.length === 0) return null;
  let maxScore = -1;
  let winners: BlindtestParticipant[] = [];
  for (const p of participants) {
    if (p.score > maxScore) {
      maxScore = p.score;
      winners = [p];
    } else if (p.score === maxScore) {
      winners.push(p);
    }
  }
  return winners.length === 1 ? winners[0].playerId : null;
}

// ─── DB → snapshot ────────────────────────────────────────────────────────────

type RoomRaw = Awaited<ReturnType<typeof fetchRoomRaw>>;

async function fetchRoomRaw(roomId: string) {
  return prisma.blindtestRoom.findUnique({
    where: { id: roomId },
    include: {
      blindtest: {
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

export function toBlindtestRoomSnapshot(room: NonNullable<RoomRaw>): BlindtestRoomSnapshot {
  return {
    id: room.id,
    blindtestId: room.blindtestId,
    hostId: room.hostId,
    hostName: room.host.username,
    visibility: room.visibility === "public" ? "public" : "private",
    status: room.status as "waiting" | "playing" | "finished",
    currentTrack: room.currentTrack,
    participants: normalizeParticipants(room.participants),
    winnerId: room.winnerId,
    updatedAt: room.updatedAt.toISOString(),
    trackStartedAt: room.trackStartedAt?.toISOString() ?? null,
    blindtest: {
      id: room.blindtest.id,
      title: room.blindtest.title,
      tracks: room.blindtest.tracks.map((t) => ({
        position: t.position,
        deezerTrackId: Number(t.deezerTrackId),
        title: t.title,
        artist: t.artist,
        coverUrl: t.coverUrl ?? null,
      })),
    },
  };
}

export async function getBlindtestRoomSnapshot(roomId: string): Promise<BlindtestRoomSnapshot | null> {
  const room = await fetchRoomRaw(roomId);
  if (!room) return null;
  return toBlindtestRoomSnapshot(room);
}
