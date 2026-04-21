import prisma from "@/lib/prisma";
import type { BlindtestAnswer, BlindtrackData } from "@/components/BlindtestGame";

export type { BlindtestAnswer, BlindtrackData };

// ─── Room snapshot ────────────────────────────────────────────────────────────

export type BlindtestRoomSnapshot = {
  id: string;
  blindtestId: string;
  hostId: string;
  guestId: string | null;
  status: "waiting" | "playing" | "finished";
  currentTrack: number;
  hostAnswers: BlindtestAnswer[];
  guestAnswers: BlindtestAnswer[];
  hostScore: number;
  guestScore: number;
  winnerId: string | null;
  hostLastSeenAt: string | null;
  guestLastSeenAt: string | null;
  updatedAt: string; // ISO string
  trackStartedAt: string | null; // ISO string — authoritative track-start anchor for timer sync
  blindtest: {
    id: string;
    title: string;
    tracks: BlindtrackData[];
  };
  hostName: string;
  guestName: string | null;
};

// ─── Event types (broadcast payload) ─────────────────────────────────────────

export type BlindtestRoomEvent =
  | { type: "guest-joined"; guestName: string }
  | { type: "game-start" }
  | { type: "answer-submitted"; playerId: string }
  | { type: "next-track"; currentTrack: number }
  | { type: "game-end"; hostScore: number; guestScore: number; winnerId: string | null }
  | { type: "rematch" };

export type BlindtestRoomBroadcastPayload = {
  room: BlindtestRoomSnapshot;
  event: BlindtestRoomEvent;
};

// ─── Scoring helpers (mirrored from BlindtestGame, server-side canonical) ─────

export { normalize, isCorrect, isSingleArtistBlindtest } from "./blindtest-utils";

export const POINTS_TITLE = 2;
export const POINTS_ARTIST = 1;

// ─── DB → snapshot ────────────────────────────────────────────────────────────

type RoomWithRelations = Awaited<ReturnType<typeof fetchRoomRaw>>;

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
      guest: { select: { id: true, username: true } },
    },
  });
}

export function toBlindtestRoomSnapshot(room: NonNullable<RoomWithRelations>): BlindtestRoomSnapshot {
  return {
    id: room.id,
    blindtestId: room.blindtestId,
    hostId: room.hostId,
    guestId: room.guestId,
    status: room.status as "waiting" | "playing" | "finished",
    currentTrack: room.currentTrack,
    hostAnswers: (room.hostAnswers as BlindtestAnswer[]) ?? [],
    guestAnswers: (room.guestAnswers as BlindtestAnswer[]) ?? [],
    hostScore: room.hostScore,
    guestScore: room.guestScore,
    winnerId: room.winnerId,
    hostLastSeenAt: room.hostLastSeenAt?.toISOString() ?? null,
    guestLastSeenAt: room.guestLastSeenAt?.toISOString() ?? null,
    updatedAt: room.updatedAt.toISOString(),
    trackStartedAt: room.trackStartedAt?.toISOString() ?? null,
    hostName: room.host.username,
    guestName: room.guest?.username ?? null,
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
