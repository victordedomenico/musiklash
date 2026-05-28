"use server";

import prisma from "@/lib/prisma";
import { resolvePlayerIdentity } from "@/lib/guest";
import {
  getStreamClashRoomSnapshot,
  toStreamClashRoomSnapshot,
  type StreamClashParticipant,
  type StreamClashRoomEvent,
} from "@/lib/stream-clash-room";
import {
  computeWinner,
  findParticipant,
  generatePairs,
  checkAnswer,
  normalizeParticipants,
  POINTS_PER_CORRECT,
  type StreamClashTrackData,
  type StreamClashRound,
  type StreamClashDifficulty,
} from "@/lib/stream-clash";
import { Prisma } from "@prisma/client";

const PRESENCE_HEARTBEAT_MIN_SECONDS = 10;

async function requirePlayer() {
  try {
    const identity = await resolvePlayerIdentity();
    return { id: identity.playerId };
  } catch {
    return null;
  }
}

function shouldHeartbeat(lastSeenAt: string | null, nowMs: number) {
  if (!lastSeenAt) return true;
  const ts = Date.parse(lastSeenAt);
  if (Number.isNaN(ts)) return true;
  return nowMs - ts >= PRESENCE_HEARTBEAT_MIN_SECONDS * 1000;
}

async function touchPresence(roomId: string, playerId: string) {
  const room = await prisma.streamClashRoom.findUnique({
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
  const json = JSON.stringify(updated);
  await prisma.$executeRaw`UPDATE stream_clash_rooms SET participants = ${json}::jsonb WHERE id = ${room.id}::uuid`;
}

async function buildResponse(roomId: string, event: StreamClashRoomEvent) {
  const room = await getStreamClashRoomSnapshot(roomId);
  if (!room) return { ok: false as const, error: "Room introuvable" };
  return { ok: true as const, room, event };
}

export async function refreshRoomState(roomId: string) {
  const user = await requirePlayer();
  if (!user) return { ok: false as const, error: "Non authentifié" };

  await touchPresence(roomId, user.id);
  const room = await prisma.streamClashRoom.findUnique({
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
  if (!room) return { ok: false as const, error: "Room introuvable" };
  return { ok: true as const, room: toStreamClashRoomSnapshot(room) };
}

export async function joinRoom(roomId: string) {
  const user = await requirePlayer();
  if (!user) return { ok: false as const, error: "Non authentifié" };

  const room = await prisma.streamClashRoom.findUnique({ where: { id: roomId } });
  if (!room) return { ok: false as const, error: "Room introuvable" };
  if (room.status !== "waiting") return { ok: false as const, error: "Partie déjà commencée" };

  const participants = normalizeParticipants(room.participants);
  if (findParticipant(participants, user.id)) {
    const snap = await getStreamClashRoomSnapshot(roomId);
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

  const newParticipant: StreamClashParticipant = {
    playerId: user.id,
    username,
    score: 0,
    rounds: [],
    lastSeenAt: nowIso,
    joinedAt: nowIso,
  };

  const updated = [...participants, newParticipant];
  await prisma.streamClashRoom.update({
    where: { id: roomId },
    data: { participants: updated as unknown as Prisma.JsonArray },
  });

  return buildResponse(roomId, { type: "player-joined", playerId: user.id, username });
}

export async function leaveRoom(roomId: string) {
  const user = await requirePlayer();
  if (!user) return { ok: false as const, error: "Non authentifié" };

  const room = await prisma.streamClashRoom.findUnique({ where: { id: roomId } });
  if (!room) return { ok: false as const, error: "Room introuvable" };
  if (room.status !== "waiting") return { ok: false as const, error: "Partie commencée" };
  if (room.hostId === user.id) return { ok: false as const, error: "L'hôte ne peut pas quitter" };

  const participants = normalizeParticipants(room.participants);
  const updated = participants.filter((p) => p.playerId !== user.id);
  if (updated.length === participants.length) {
    return buildResponse(roomId, { type: "player-left", playerId: user.id });
  }
  await prisma.streamClashRoom.update({
    where: { id: roomId },
    data: { participants: updated as unknown as Prisma.JsonArray },
  });
  return buildResponse(roomId, { type: "player-left", playerId: user.id });
}

function pickPair(
  tracks: StreamClashTrackData[],
  difficulty: StreamClashDifficulty,
  usedIndices: Set<string>,
): { trackA: StreamClashTrackData; trackB: StreamClashTrackData } | null {
  const allPairs = generatePairs(tracks, difficulty, 200);
  for (const pair of allPairs) {
    const key = [pair.trackA.position, pair.trackB.position].sort().join("-");
    if (!usedIndices.has(key)) {
      usedIndices.add(key);
      return pair;
    }
  }
  // If all pairs used, allow reuse
  return allPairs[0] ?? null;
}

export async function startGame(roomId: string) {
  const user = await requirePlayer();
  if (!user) return { ok: false as const, error: "Non authentifié" };

  const room = await prisma.streamClashRoom.findUnique({
    where: { id: roomId },
    include: { streamClash: { include: { tracks: true } } },
  });
  if (!room) return { ok: false as const, error: "Room introuvable" };
  if (room.hostId !== user.id) return { ok: false as const, error: "Seul l'hôte peut lancer la partie" };
  if (room.status !== "waiting") return { ok: false as const, error: "Partie déjà en cours" };

  const participants = normalizeParticipants(room.participants);
  if (participants.length < 2) {
    return { ok: false as const, error: "Au moins 2 joueurs requis" };
  }

  const tracks: StreamClashTrackData[] = room.streamClash.tracks.map((t) => ({
    position: t.position,
    externalId: Number(t.externalId),
    title: t.title,
    artist: t.artist,
    previewUrl: t.previewUrl,
    coverUrl: t.coverUrl ?? null,
    rank: t.rank,
  }));

  const usedIndices = new Set<string>();
  const firstPair = pickPair(tracks, room.difficulty as StreamClashDifficulty, usedIndices);
  if (!firstPair) {
    return { ok: false as const, error: "Pas assez d'entrées compatibles avec cette difficulté." };
  }

  const nowIso = new Date().toISOString();
  const reset = participants.map((p) => ({
    ...p,
    score: 0,
    rounds: [],
    lastSeenAt: nowIso,
  }));

  await prisma.streamClashRoom.update({
    where: { id: roomId },
    data: {
      status: "playing",
      currentRound: 0,
      winnerId: null,
      pairStartedAt: new Date(),
      currentPair: firstPair as unknown as Prisma.JsonObject,
      participants: reset as unknown as Prisma.JsonArray,
    },
  });

  return buildResponse(roomId, { type: "game-start" });
}

export async function submitAnswer(roomId: string, chosenPosition: number) {
  const user = await requirePlayer();
  if (!user) return { ok: false as const, error: "Non authentifié" };

  const room = await prisma.streamClashRoom.findUnique({
    where: { id: roomId },
    include: { streamClash: { include: { tracks: true } } },
  });
  if (!room) return { ok: false as const, error: "Room introuvable" };
  if (room.status !== "playing") return { ok: false as const, error: "Partie non en cours" };

  const pair = room.currentPair as unknown as { trackA: StreamClashTrackData; trackB: StreamClashTrackData } | null;
  if (!pair) return { ok: false as const, error: "Pas de paire active" };

  const participants = normalizeParticipants(room.participants);
  const me = findParticipant(participants, user.id);
  if (!me) return { ok: false as const, error: "Tu n'es pas dans cette room" };

  if (me.rounds.length > room.currentRound) {
    return { ok: false as const, error: "Déjà répondu" };
  }

  const correct = checkAnswer(pair, chosenPosition);
  const points = correct ? POINTS_PER_CORRECT : 0;

  const round: StreamClashRound = {
    positionA: pair.trackA.position,
    positionB: pair.trackB.position,
    rankA: pair.trackA.rank,
    rankB: pair.trackB.rank,
    correct,
    chosenPosition,
  };

  const updated = participants.map((p) =>
    p.playerId === user.id
      ? {
          ...p,
          rounds: [...p.rounds, round],
          score: p.score + points,
          lastSeenAt: new Date().toISOString(),
        }
      : p,
  );

  await prisma.streamClashRoom.update({
    where: { id: roomId },
    data: { participants: updated as unknown as Prisma.JsonArray },
  });

  return buildResponse(roomId, { type: "answer-submitted", playerId: user.id });
}

export async function nextRound(roomId: string) {
  const user = await requirePlayer();
  if (!user) return { ok: false as const, error: "Non authentifié" };

  const room = await prisma.streamClashRoom.findUnique({
    where: { id: roomId },
    include: { streamClash: { include: { tracks: true } } },
  });
  if (!room) return { ok: false as const, error: "Room introuvable" };
  if (room.hostId !== user.id) return { ok: false as const, error: "Seul l'hôte peut avancer" };
  if (room.status !== "playing") return { ok: false as const, error: "Partie non en cours" };

  const isLast = room.currentRound + 1 >= room.totalRounds;

  if (isLast) {
    const participants = normalizeParticipants(room.participants);
    const winnerId = computeWinner(participants);

    await prisma.streamClashRoom.update({
      where: { id: roomId },
    data: {
      status: "finished",
      winnerId,
      pairStartedAt: null,
      currentPair: Prisma.JsonNull,
    },
    });

    return buildResponse(roomId, { type: "game-end", winnerId });
  }

  const tracks: StreamClashTrackData[] = room.streamClash.tracks.map((t) => ({
    position: t.position,
    externalId: Number(t.externalId),
    title: t.title,
    artist: t.artist,
    previewUrl: t.previewUrl,
    coverUrl: t.coverUrl ?? null,
    rank: t.rank,
  }));

  // Build used pairs from existing rounds
  const participants = normalizeParticipants(room.participants);
  const usedIndices = new Set<string>();
  for (const p of participants) {
    for (const r of p.rounds) {
      usedIndices.add([r.positionA, r.positionB].sort().join("-"));
    }
  }

  const nextPair = pickPair(tracks, room.difficulty as StreamClashDifficulty, usedIndices);

  await prisma.streamClashRoom.update({
    where: { id: roomId },
    data: {
      currentRound: { increment: 1 },
      pairStartedAt: new Date(),
      currentPair: nextPair ? (nextPair as unknown as Prisma.JsonObject) : Prisma.JsonNull,
    },
  });

  const snap = await getStreamClashRoomSnapshot(roomId);
  if (!snap) return { ok: false as const, error: "Room introuvable" };
  return {
    ok: true as const,
    room: snap,
    event: { type: "next-round" as const, currentRound: snap.currentRound },
  };
}

export async function rematch(roomId: string) {
  const user = await requirePlayer();
  if (!user) return { ok: false as const, error: "Non authentifié" };

  const room = await prisma.streamClashRoom.findUnique({
    where: { id: roomId },
    include: { streamClash: { include: { tracks: true } } },
  });
  if (!room) return { ok: false as const, error: "Room introuvable" };

  const participants = normalizeParticipants(room.participants);
  if (!findParticipant(participants, user.id)) {
    return { ok: false as const, error: "Tu n'es pas dans cette room" };
  }

  const tracks: StreamClashTrackData[] = room.streamClash.tracks.map((t) => ({
    position: t.position,
    externalId: Number(t.externalId),
    title: t.title,
    artist: t.artist,
    previewUrl: t.previewUrl,
    coverUrl: t.coverUrl ?? null,
    rank: t.rank,
  }));

  const usedIndices = new Set<string>();
  const firstPair = pickPair(tracks, room.difficulty as StreamClashDifficulty, usedIndices);

  const nowIso = new Date().toISOString();
  const reset = participants.map((p) => ({
    ...p,
    score: 0,
    rounds: [],
    lastSeenAt: nowIso,
  }));

  await prisma.streamClashRoom.update({
    where: { id: roomId },
    data: {
      status: "waiting",
      currentRound: 0,
      winnerId: null,
      pairStartedAt: null,
      currentPair: Prisma.JsonNull,
      participants: reset as unknown as Prisma.JsonArray,
    },
  });

  // Ignore firstPair — host will call startGame again

  return buildResponse(roomId, { type: "rematch" });
}
