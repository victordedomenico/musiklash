"use server";

import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import {
  getBlindtestRoomSnapshot,
  isCorrect,
  POINTS_TITLE,
  POINTS_ARTIST,
} from "@/lib/blindtest-room";
import type { BlindtestRoomEvent } from "@/lib/blindtest-room";
import type { BlindtestAnswer } from "@/components/BlindtestGame";
import type { Prisma } from "@prisma/client";

// ─── Auth helper ────────────────────────────────────────────────────────────

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return user;
}

// ─── Response builder ────────────────────────────────────────────────────────

async function buildResponse(roomId: string, event: BlindtestRoomEvent) {
  const room = await getBlindtestRoomSnapshot(roomId);
  if (!room) return { ok: false as const, error: "Room introuvable" };
  return { ok: true as const, room, event };
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function joinRoom(roomId: string) {
  const user = await requireUser();
  if (!user) return { ok: false as const, error: "Non authentifié" };

  const room = await prisma.blindtestRoom.findUnique({ where: { id: roomId } });
  if (!room) return { ok: false as const, error: "Room introuvable" };
  if (room.hostId === user.id) return { ok: false as const, error: "Tu es déjà l'hôte" };
  if (room.guestId && room.guestId !== user.id) return { ok: false as const, error: "Room pleine" };
  if (room.status !== "waiting") return { ok: false as const, error: "Partie déjà commencée" };

  await prisma.blindtestRoom.update({
    where: { id: roomId },
    data: { guestId: user.id },
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
  const user = await requireUser();
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
  const user = await requireUser();
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
  const correctTitle = isCorrect(guessTitle, track.title);
  const correctArtist = isCorrect(guessArtist, track.artist);
  const points = (correctTitle ? POINTS_TITLE : 0) + (correctArtist ? POINTS_ARTIST : 0);

  const answer: BlindtestAnswer = {
    position,
    guessTitle,
    guessArtist,
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
      },
    });
  } else {
    await prisma.blindtestRoom.update({
      where: { id: roomId },
      data: {
        guestAnswers: newAnswers,
        guestScore: { increment: points },
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
  const user = await requireUser();
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
  const user = await requireUser();
  if (!user) return { ok: false as const, error: "Non authentifié" };

  const room = await prisma.blindtestRoom.findUnique({ where: { id: roomId } });
  if (!room) return { ok: false as const, error: "Room introuvable" };
  if (room.hostId !== user.id && room.guestId !== user.id) {
    return { ok: false as const, error: "Tu n'es pas dans cette room" };
  }

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
    },
  });

  return buildResponse(roomId, { type: "rematch" });
}
