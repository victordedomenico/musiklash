"use server";

import prisma from "@/lib/prisma";
import { resolvePlayerIdentity } from "@/lib/guest";
import {
  computeWinner,
  findParticipant,
  getBlindtestRoomSnapshot,
  isCorrect,
  isSingleArtistBlindtest,
  normalizeParticipants,
  POINTS_ARTIST,
  POINTS_TITLE,
  toBlindtestRoomSnapshot,
} from "@/lib/blindtest-room";
import type {
  BlindtestParticipant,
  BlindtestRoomEvent,
} from "@/lib/blindtest-room";
import type { BlindtestAnswer } from "@/components/BlindtestGame";
import type { Prisma } from "@prisma/client";

const PRESENCE_HEARTBEAT_MIN_SECONDS = 10;
const BLINDTEST_ROOM_PARTICIPANTS_UNAVAILABLE =
  "Room multijoueur indisponible sur ce schéma de base de données (champ participants manquant).";

function modelHasField(modelName: string, fieldName: string): boolean {
  const runtime = (
    prisma as unknown as {
      _runtimeDataModel?: {
        models?: Record<string, { fields?: Array<{ name: string }> }>;
      };
    }
  )._runtimeDataModel;
  const model = runtime?.models?.[modelName];
  if (!model?.fields) return false;
  return model.fields.some((f) => f.name === fieldName);
}

const hasBlindtestRoomParticipants = modelHasField("BlindtestRoom", "participants");

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function requirePlayer() {
  try {
    const identity = await resolvePlayerIdentity();
    return { id: identity.playerId };
  } catch {
    return null;
  }
}

// ─── Presence heartbeat ──────────────────────────────────────────────────────

function shouldHeartbeat(lastSeenAt: string | null, nowMs: number) {
  if (!lastSeenAt) return true;
  const ts = Date.parse(lastSeenAt);
  if (Number.isNaN(ts)) return true;
  return nowMs - ts >= PRESENCE_HEARTBEAT_MIN_SECONDS * 1000;
}

async function touchPresence(roomId: string, playerId: string) {
  if (!hasBlindtestRoomParticipants) return;

  const room = await prisma.blindtestRoom.findUnique({
    where: { id: roomId },
    select: { id: true, participants: true, status: true },
  });
  if (!room || room.status === "finished") return;

  const participants = normalizeParticipants(room.participants);
  const me = findParticipant(participants, playerId);
  if (!me) return;

  const nowMs = Date.now();
  if (!shouldHeartbeat(me.lastSeenAt, nowMs)) return;

  const updated = participants.map((p) =>
    p.playerId === playerId ? { ...p, lastSeenAt: new Date().toISOString() } : p,
  );
  // Raw update so updated_at does not bump and polling loops don't flicker.
  const json = JSON.stringify(updated);
  await prisma.$executeRaw`UPDATE blindtest_rooms SET participants = ${json}::jsonb WHERE id = ${room.id}::uuid`;
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

  await touchPresence(roomId, user.id);
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
    },
  });
  if (!room) return { ok: false as const, error: "Room introuvable" };
  return { ok: true as const, room: toBlindtestRoomSnapshot(room) };
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function joinRoom(roomId: string) {
  if (!hasBlindtestRoomParticipants) {
    return { ok: false as const, error: BLINDTEST_ROOM_PARTICIPANTS_UNAVAILABLE };
  }

  const user = await requirePlayer();
  if (!user) return { ok: false as const, error: "Non authentifié" };

  const room = await prisma.blindtestRoom.findUnique({ where: { id: roomId } });
  if (!room) return { ok: false as const, error: "Room introuvable" };
  if (room.status !== "waiting") return { ok: false as const, error: "Partie déjà commencée" };

  const participants = normalizeParticipants(room.participants);
  if (findParticipant(participants, user.id)) {
    // Already joined — idempotent.
    const snap = await getBlindtestRoomSnapshot(roomId);
    if (!snap) return { ok: false as const, error: "Room introuvable" };
    return {
      ok: true as const,
      room: snap,
      event: {
        type: "player-joined" as const,
        playerId: user.id,
        username: findParticipant(snap.participants, user.id)?.username ?? "Joueur",
      },
    };
  }

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { username: true },
  });
  const username = profile?.username ?? "Joueur";

  const nowIso = new Date().toISOString();
  const newParticipant: BlindtestParticipant = {
    playerId: user.id,
    username,
    score: 0,
    answers: [],
    lastSeenAt: nowIso,
    joinedAt: nowIso,
  };

  const updated = [...participants, newParticipant];
  await prisma.blindtestRoom.update({
    where: { id: roomId },
    data: { participants: updated as unknown as Prisma.JsonArray },
  });

  return buildResponse(roomId, {
    type: "player-joined",
    playerId: user.id,
    username,
  });
}

export async function leaveRoom(roomId: string) {
  if (!hasBlindtestRoomParticipants) {
    return { ok: false as const, error: BLINDTEST_ROOM_PARTICIPANTS_UNAVAILABLE };
  }

  const user = await requirePlayer();
  if (!user) return { ok: false as const, error: "Non authentifié" };

  const room = await prisma.blindtestRoom.findUnique({ where: { id: roomId } });
  if (!room) return { ok: false as const, error: "Room introuvable" };
  if (room.status !== "waiting") return { ok: false as const, error: "Partie commencée" };
  if (room.hostId === user.id) return { ok: false as const, error: "L'hôte ne peut pas quitter" };

  const participants = normalizeParticipants(room.participants);
  const updated = participants.filter((p) => p.playerId !== user.id);
  if (updated.length === participants.length) {
    return buildResponse(roomId, { type: "player-left", playerId: user.id });
  }
  await prisma.blindtestRoom.update({
    where: { id: roomId },
    data: { participants: updated as unknown as Prisma.JsonArray },
  });
  return buildResponse(roomId, { type: "player-left", playerId: user.id });
}

export async function startGame(roomId: string) {
  if (!hasBlindtestRoomParticipants) {
    return { ok: false as const, error: BLINDTEST_ROOM_PARTICIPANTS_UNAVAILABLE };
  }

  const user = await requirePlayer();
  if (!user) return { ok: false as const, error: "Non authentifié" };

  const room = await prisma.blindtestRoom.findUnique({ where: { id: roomId } });
  if (!room) return { ok: false as const, error: "Room introuvable" };
  if (room.hostId !== user.id) return { ok: false as const, error: "Seul l'hôte peut lancer la partie" };
  if (room.status !== "waiting") return { ok: false as const, error: "Partie déjà en cours" };

  const participants = normalizeParticipants(room.participants);
  if (participants.length < 2) {
    return { ok: false as const, error: "Au moins 2 joueurs requis" };
  }

  const nowIso = new Date().toISOString();
  const reset = participants.map((p) => ({
    ...p,
    score: 0,
    answers: [],
    lastSeenAt: nowIso,
  }));

  await prisma.blindtestRoom.update({
    where: { id: roomId },
    data: {
      status: "playing",
      currentTrack: 0,
      winnerId: null,
      trackStartedAt: new Date(),
      participants: reset as unknown as Prisma.JsonArray,
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
  if (!hasBlindtestRoomParticipants) {
    return { ok: false as const, error: BLINDTEST_ROOM_PARTICIPANTS_UNAVAILABLE };
  }

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
  if (room.currentTrack !== position) return { ok: false as const, error: "Position incorrecte" };

  const participants = normalizeParticipants(room.participants);
  const me = findParticipant(participants, user.id);
  if (!me) return { ok: false as const, error: "Tu n'es pas dans cette room" };

  if (me.answers.some((a) => a.position === position)) {
    return { ok: false as const, error: "Déjà répondu" };
  }

  const track = room.blindtest.tracks.find((t) => t.position === position);
  if (!track) return { ok: false as const, error: "Morceau introuvable" };

  const singleArtistMode = isSingleArtistBlindtest(room.blindtest.tracks);
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

  const updated = participants.map((p) =>
    p.playerId === user.id
      ? {
          ...p,
          answers: [...p.answers, answer],
          score: p.score + points,
          lastSeenAt: new Date().toISOString(),
        }
      : p,
  );

  await prisma.blindtestRoom.update({
    where: { id: roomId },
    data: { participants: updated as unknown as Prisma.JsonArray },
  });

  return buildResponse(roomId, { type: "answer-submitted", playerId: user.id });
}

export async function nextTrack(roomId: string) {
  if (!hasBlindtestRoomParticipants) {
    return { ok: false as const, error: BLINDTEST_ROOM_PARTICIPANTS_UNAVAILABLE };
  }

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
    const participants = normalizeParticipants(room.participants);
    const winnerId = computeWinner(participants);

    await prisma.blindtestRoom.update({
      where: { id: roomId },
      data: { status: "finished", winnerId, trackStartedAt: null },
    });

    return buildResponse(roomId, { type: "game-end", winnerId });
  }

  await prisma.blindtestRoom.update({
    where: { id: roomId },
    data: {
      currentTrack: { increment: 1 },
      trackStartedAt: new Date(),
    },
  });

  const snap = await getBlindtestRoomSnapshot(roomId);
  if (!snap) return { ok: false as const, error: "Room introuvable" };
  return {
    ok: true as const,
    room: snap,
    event: { type: "next-track" as const, currentTrack: snap.currentTrack },
  };
}

export async function rematch(roomId: string) {
  if (!hasBlindtestRoomParticipants) {
    return { ok: false as const, error: BLINDTEST_ROOM_PARTICIPANTS_UNAVAILABLE };
  }

  const user = await requirePlayer();
  if (!user) return { ok: false as const, error: "Non authentifié" };

  const room = await prisma.blindtestRoom.findUnique({ where: { id: roomId } });
  if (!room) return { ok: false as const, error: "Room introuvable" };
  const participants = normalizeParticipants(room.participants);
  if (!findParticipant(participants, user.id)) {
    return { ok: false as const, error: "Tu n'es pas dans cette room" };
  }

  const nowIso = new Date().toISOString();
  const reset = participants.map((p) => ({
    ...p,
    score: 0,
    answers: [],
    lastSeenAt: nowIso,
  }));

  await prisma.blindtestRoom.update({
    where: { id: roomId },
    data: {
      status: "waiting",
      currentTrack: 0,
      winnerId: null,
      trackStartedAt: null,
      participants: reset as unknown as Prisma.JsonArray,
    },
  });

  return buildResponse(roomId, { type: "rematch" });
}
