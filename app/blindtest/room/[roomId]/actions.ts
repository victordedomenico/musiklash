"use server";

import prisma from "@/lib/prisma";
import { resolvePlayerIdentity } from "@/lib/guest";
import {
  getBlindtestRoomSnapshot,
  isCorrect,
  isSingleArtistBlindtest,
  POINTS_TITLE,
  POINTS_ARTIST,
  toBlindtestRoomSnapshot,
} from "@/lib/blindtest-room";
import type { BlindtestRoomEvent } from "@/lib/blindtest-room";
import type { BlindtestAnswer } from "@/components/BlindtestGame";
import type { Prisma } from "@prisma/client";

const PRESENCE_HEARTBEAT_MIN_SECONDS = 10;
const PRESENCE_GRACE_SECONDS = 45;

// ─── Auth helper ────────────────────────────────────────────────────────────

async function requirePlayer() {
  try {
    const identity = await resolvePlayerIdentity();
    return { id: identity.playerId };
  } catch {
    return null;
  }
}

function isPresenceStale(lastSeenAt: Date | null, nowMs: number) {
  if (!lastSeenAt) return true;
  return nowMs - lastSeenAt.getTime() > PRESENCE_GRACE_SECONDS * 1000;
}

function shouldHeartbeat(lastSeenAt: Date | null, nowMs: number) {
  if (!lastSeenAt) return true;
  return nowMs - lastSeenAt.getTime() >= PRESENCE_HEARTBEAT_MIN_SECONDS * 1000;
}

async function touchPresenceAndResolve(roomId: string, playerId: string): Promise<void> {
  const room = await prisma.blindtestRoom.findUnique({
    where: { id: roomId },
    select: {
      id: true,
      hostId: true,
      guestId: true,
      status: true,
      winnerId: true,
      hostLastSeenAt: true,
      guestLastSeenAt: true,
    },
  });
  if (!room || room.status === "finished") return;

  const now = new Date();
  const nowMs = now.getTime();
  const isHost = playerId === room.hostId;
  const isGuest = playerId === room.guestId;

  // Use raw SQL so the heartbeat does NOT bump `updated_at`. The polling loop
  // watches `updatedAt` to detect real state changes and the client would
  // otherwise resync the room (and flicker) on every heartbeat.
  if (isHost && shouldHeartbeat(room.hostLastSeenAt, nowMs)) {
    await prisma.$executeRaw`UPDATE blindtest_rooms SET host_last_seen_at = ${now} WHERE id = ${room.id}::uuid`;
    room.hostLastSeenAt = now;
  } else if (isGuest && shouldHeartbeat(room.guestLastSeenAt, nowMs)) {
    await prisma.$executeRaw`UPDATE blindtest_rooms SET guest_last_seen_at = ${now} WHERE id = ${room.id}::uuid`;
    room.guestLastSeenAt = now;
  }

  const hostStale = isPresenceStale(room.hostLastSeenAt, nowMs);
  const guestStale = room.guestId ? isPresenceStale(room.guestLastSeenAt, nowMs) : false;

  if (room.status === "waiting" && room.guestId && guestStale && !hostStale) {
    await prisma.blindtestRoom.update({
      where: { id: room.id },
      data: { guestId: null, guestLastSeenAt: null },
    });
    return;
  }

  if (room.status === "waiting" && room.guestId && hostStale && !guestStale) {
    // Host left the lobby before the game started — promote the guest to host
    // so the session can continue (wait for a new opponent, rematch, etc.)
    // instead of declaring a spurious winner.
    await prisma.blindtestRoom.update({
      where: { id: room.id },
      data: {
        hostId: room.guestId,
        guestId: null,
        hostLastSeenAt: room.guestLastSeenAt ?? new Date(),
        guestLastSeenAt: null,
        trackStartedAt: null,
      },
    });
    return;
  }

  if (room.status === "playing" && room.guestId && hostStale !== guestStale) {
    const winnerId = hostStale ? room.guestId : room.hostId;
    await prisma.blindtestRoom.update({
      where: { id: room.id },
      data: { status: "finished", winnerId, trackStartedAt: null },
    });
  }
}

// ─── Response builder ────────────────────────────────────────────────────────

async function buildResponse(roomId: string, event: BlindtestRoomEvent) {
  const room = await getBlindtestRoomSnapshot(roomId);
  if (!room) return { ok: false as const, error: "Room introuvable" };
  return { ok: true as const, room, event };
}

/** Re-fetch room from DB — fallback when Realtime broadcast does not reach every client. */
export async function refreshRoomState(roomId: string) {
  const user = await requirePlayer();
  if (!user) return { ok: false as const, error: "Non authentifié" };

  await touchPresenceAndResolve(roomId, user.id);
  const room = await prisma.blindtestRoom.findUnique({
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
  if (!room) return { ok: false as const, error: "Room introuvable" };
  return { ok: true as const, room: toBlindtestRoomSnapshot(room) };
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function joinRoom(roomId: string) {
  const user = await requirePlayer();
  if (!user) return { ok: false as const, error: "Non authentifié" };

  const room = await prisma.blindtestRoom.findUnique({ where: { id: roomId } });
  if (!room) return { ok: false as const, error: "Room introuvable" };
  if (room.hostId === user.id) return { ok: false as const, error: "Tu es déjà l'hôte" };
  if (room.guestId && room.guestId !== user.id) return { ok: false as const, error: "Room pleine" };
  if (room.status !== "waiting") return { ok: false as const, error: "Partie déjà commencée" };

  await prisma.blindtestRoom.update({
    where: { id: roomId },
    data: { guestId: user.id, guestLastSeenAt: new Date() },
  });

  const snapshot = await getBlindtestRoomSnapshot(roomId);
  if (!snapshot) return { ok: false as const, error: "Room introuvable" };

  return {
    ok: true as const,
    room: snapshot,
    event: { type: "guest-joined" as const, guestName: snapshot.guestName ?? "Adversaire" },
  };
}

export async function startGame(roomId: string) {
  const user = await requirePlayer();
  if (!user) return { ok: false as const, error: "Non authentifié" };

  const room = await prisma.blindtestRoom.findUnique({ where: { id: roomId } });
  if (!room) return { ok: false as const, error: "Room introuvable" };
  if (room.hostId !== user.id) return { ok: false as const, error: "Seul l'hôte peut lancer la partie" };
  if (!room.guestId) return { ok: false as const, error: "En attente d'un adversaire" };
  if (room.status !== "waiting") return { ok: false as const, error: "Partie déjà en cours" };

  const now = new Date();
  await prisma.blindtestRoom.update({
    where: { id: roomId },
    data: {
      status: "playing",
      currentTrack: 0,
      hostAnswers: [],
      guestAnswers: [],
      hostScore: 0,
      guestScore: 0,
      winnerId: null,
      trackStartedAt: now,
      hostLastSeenAt: now,
      guestLastSeenAt: now,
    },
  });

  return buildResponse(roomId, { type: "game-start" });
}

export async function submitAnswer(
  roomId: string,
  position: number,
  guessTitle: string,
  guessArtist: string,
) {
  const user = await requirePlayer();
  if (!user) return { ok: false as const, error: "Non authentifié" };

  const room = await prisma.blindtestRoom.findUnique({
    where: { id: roomId },
    include: {
      blindtest: { include: { tracks: { orderBy: { position: "asc" } } } },
    },
  });
  if (!room) return { ok: false as const, error: "Room introuvable" };
  if (room.status !== "playing") return { ok: false as const, error: "Partie non en cours" };

  const isHost = user.id === room.hostId;
  const isGuest = user.id === room.guestId;
  if (!isHost && !isGuest) return { ok: false as const, error: "Tu n'es pas dans cette room" };
  if (room.currentTrack !== position) return { ok: false as const, error: "Position incorrecte" };

  // Check if already submitted for this position
  const existingAnswers = (isHost ? room.hostAnswers : room.guestAnswers) as BlindtestAnswer[];
  if (existingAnswers.some((a) => a.position === position)) {
    return { ok: false as const, error: "Déjà répondu" };
  }

  // Find the current track
  const track = room.blindtest.tracks.find((t) => t.position === position);
  if (!track) return { ok: false as const, error: "Morceau introuvable" };

  // Compute correctness server-side
  const tracks = room.blindtest.tracks;
  const singleArtistMode = isSingleArtistBlindtest(tracks);
  const correctTitle = isCorrect(guessTitle, track.title);
  const correctArtist = singleArtistMode ? true : isCorrect(guessArtist, track.artist);
  const points = (correctTitle ? POINTS_TITLE : 0) + (correctArtist ? POINTS_ARTIST : 0);

  const answer: BlindtestAnswer = {
    position,
    guessTitle,
    guessArtist: singleArtistMode ? track.artist : guessArtist,
    correctTitle,
    correctArtist,
    points,
    trueTitle: track.title,
    trueArtist: track.artist,
    coverUrl: track.coverUrl ?? null,
  };

  const newAnswers = [...existingAnswers, answer] as unknown as Prisma.JsonArray;

  if (isHost) {
    await prisma.blindtestRoom.update({
      where: { id: roomId },
      data: {
        hostAnswers: newAnswers,
        hostScore: { increment: points },
        hostLastSeenAt: new Date(),
      },
    });
  } else {
    await prisma.blindtestRoom.update({
      where: { id: roomId },
      data: {
        guestAnswers: newAnswers,
        guestScore: { increment: points },
        guestLastSeenAt: new Date(),
      },
    });
  }

  const snapshot = await getBlindtestRoomSnapshot(roomId);
  if (!snapshot) return { ok: false as const, error: "Room introuvable" };

  return {
    ok: true as const,
    room: snapshot,
    answer,
    event: { type: "answer-submitted" as const, playerId: user.id },
  };
}

export async function nextTrack(roomId: string) {
  const user = await requirePlayer();
  if (!user) return { ok: false as const, error: "Non authentifié" };

  const room = await prisma.blindtestRoom.findUnique({
    where: { id: roomId },
    include: {
      blindtest: { select: { tracks: { select: { position: true } } } },
    },
  });
  if (!room) return { ok: false as const, error: "Room introuvable" };
  if (room.hostId !== user.id) return { ok: false as const, error: "Seul l'hôte peut avancer" };
  if (room.status !== "playing") return { ok: false as const, error: "Partie non en cours" };

  const trackCount = room.blindtest.tracks.length;
  const isLast = room.currentTrack + 1 >= trackCount;

  if (isLast) {
    // End the game
    const hostScore = room.hostScore;
    const guestScore = room.guestScore;
    const winnerId =
      hostScore > guestScore
        ? room.hostId
        : guestScore > hostScore
        ? room.guestId
        : null; // draw

    await prisma.blindtestRoom.update({
      where: { id: roomId },
      data: { status: "finished", winnerId },
    });

    const snapshot = await getBlindtestRoomSnapshot(roomId);
    if (!snapshot) return { ok: false as const, error: "Room introuvable" };

    return {
      ok: true as const,
      room: snapshot,
      event: {
        type: "game-end" as const,
        hostScore: snapshot.hostScore,
        guestScore: snapshot.guestScore,
        winnerId: snapshot.winnerId,
      },
    };
  }

  // Advance to next track — set trackStartedAt to now
  const now = new Date();
  await prisma.blindtestRoom.update({
    where: { id: roomId },
    data: {
      currentTrack: { increment: 1 },
      trackStartedAt: now,
      hostLastSeenAt: now,
    },
  });

  const snapshot = await getBlindtestRoomSnapshot(roomId);
  if (!snapshot) return { ok: false as const, error: "Room introuvable" };

  return {
    ok: true as const,
    room: snapshot,
    event: { type: "next-track" as const, currentTrack: snapshot.currentTrack },
  };
}

export async function rematch(roomId: string) {
  const user = await requirePlayer();
  if (!user) return { ok: false as const, error: "Non authentifié" };

  const room = await prisma.blindtestRoom.findUnique({ where: { id: roomId } });
  if (!room) return { ok: false as const, error: "Room introuvable" };
  if (room.hostId !== user.id && room.guestId !== user.id) {
    return { ok: false as const, error: "Tu n'es pas dans cette room" };
  }

  // Reset both presence timestamps: the results screen does not poll, so the
  // non-caller's `lastSeenAt` can be many seconds stale. Starting a fresh grace
  // window here prevents a spurious "opponent disconnected" warning right after
  // the room returns to "waiting". Real absence is detected normally by the
  // heartbeat that follows.
  const now = new Date();
  await prisma.blindtestRoom.update({
    where: { id: roomId },
    data: {
      status: "waiting",
      currentTrack: 0,
      hostAnswers: [],
      guestAnswers: [],
      hostScore: 0,
      guestScore: 0,
      winnerId: null,
      trackStartedAt: null,
      hostLastSeenAt: now,
      guestLastSeenAt: now,
    },
  });

  return buildResponse(roomId, { type: "rematch" });
}
