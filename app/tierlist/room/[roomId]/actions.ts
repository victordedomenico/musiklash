"use server";

import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { resolvePlayerIdentity } from "@/lib/guest";
import { BRACKET_DUEL_SECONDS } from "@/lib/bracket-room-rules";
import { removePlayerBallot, replacePlayerBallot } from "@/lib/room-ballots";
import { resolveTierlistBallots } from "@/lib/tierlist-room-rules";
import {
  getTierlistRoomSnapshot,
  normalizeParticipants,
  normalizePlacements,
  normalizeTierlistBallots,
  type TierlistBallot,
} from "@/lib/collaborative-room";
import { DEFAULT_TIERS } from "@/lib/tierlist-tiers";

async function identity() {
  try {
    return await resolvePlayerIdentity();
  } catch {
    return null;
  }
}

async function response(roomId: string) {
  const room = await getTierlistRoomSnapshot(roomId);
  return room ? { ok: true as const, room } : { ok: false as const, error: "Room introuvable." };
}

export async function refreshTierlistRoom(roomId: string) {
  return response(roomId);
}

export async function joinTierlistRoom(roomId: string) {
  const user = await identity();
  if (!user) return { ok: false as const, error: "Connexion requise." };
  const room = await prisma.tierlistRoom.findUnique({ where: { id: roomId } });
  if (!room) return { ok: false as const, error: "Room introuvable." };
  if (room.status !== "waiting") return { ok: false as const, error: "La partie a déjà commencé." };
  const participants = normalizeParticipants(room.participants);
  if (!participants.some((participant) => participant.playerId === user.playerId)) {
    await prisma.tierlistRoom.update({
      where: { id: roomId },
      data: {
        participants: [
          ...participants,
          { playerId: user.playerId, username: user.username },
        ] as unknown as Prisma.JsonArray,
        revision: { increment: 1 },
      },
    });
  }
  return response(roomId);
}

export async function startTierlistRoom(roomId: string) {
  const user = await identity();
  if (!user) return { ok: false as const, error: "Connexion requise." };
  const room = await prisma.tierlistRoom.findUnique({
    where: { id: roomId },
    include: { tierlist: { select: { tracks: { orderBy: { position: "asc" }, take: 1 } } } },
  });
  if (!room) return { ok: false as const, error: "Room introuvable." };
  if (room.hostId !== user.playerId)
    return { ok: false as const, error: "Seul l’hôte peut lancer la partie." };
  if (room.status !== "waiting") return { ok: false as const, error: "La partie est déjà lancée." };
  if (normalizeParticipants(room.participants).length < 2)
    return { ok: false as const, error: "Il faut au moins 2 joueurs." };
  const firstTrack = room.tierlist.tracks[0];
  if (!firstTrack)
    return { ok: false as const, error: "Cette tierlist ne contient aucun morceau." };
  await prisma.tierlistRoom.update({
    where: { id: roomId },
    data: {
      status: "playing",
      currentPosition: firstTrack.position,
      placements: {},
      ballots: [],
      lastResolution: Prisma.DbNull,
      positionStartedAt: new Date(),
      revision: { increment: 1 },
    },
  });
  return response(roomId);
}

async function findRoomForVote(roomId: string) {
  return prisma.tierlistRoom.findUnique({
    where: { id: roomId },
    include: { tierlist: { select: { tracks: { orderBy: { position: "asc" } } } } },
  });
}

type TierlistVoteRoom = NonNullable<Awaited<ReturnType<typeof findRoomForVote>>>;

function currentTrack(room: TierlistVoteRoom) {
  return room.tierlist.tracks.find((track) => track.position === room.currentPosition) ?? null;
}

function hasExpired(room: TierlistVoteRoom) {
  const startedAt = room.positionStartedAt ?? (room.status === "playing" ? room.updatedAt : null);
  return Boolean(startedAt && Date.now() >= startedAt.getTime() + BRACKET_DUEL_SECONDS * 1000);
}

function resolvedPositionData(room: TierlistVoteRoom, ballots: TierlistBallot[]) {
  const track = currentTrack(room);
  if (!track) return null;
  const resolution = resolveTierlistBallots(ballots);
  const placements = normalizePlacements(room.placements);
  const nextPlacements = { ...placements, [String(room.currentPosition)]: resolution.tierId };
  const positions = room.tierlist.tracks.map((candidate) => candidate.position);
  const currentIndex = positions.indexOf(room.currentPosition);
  const finished = currentIndex === -1 || currentIndex >= positions.length - 1;
  const nextPosition = positions[currentIndex + 1] ?? room.currentPosition;

  return {
    placements: nextPlacements as unknown as Prisma.JsonObject,
    ballots: [] as Prisma.JsonArray,
    currentPosition: nextPosition,
    lastResolution: {
      id: `${room.currentPosition}:${Object.keys(nextPlacements).length}`,
      position: room.currentPosition,
      tierId: resolution.tierId,
      votesByTier: resolution.votesByTier,
      skippedCount: resolution.skippedCount,
      tie: resolution.tie,
      coinSide: resolution.coinSide,
      pileTierId: resolution.pileTierId,
      faceTierId: resolution.faceTierId,
      resolvedAt: new Date().toISOString(),
    } as unknown as Prisma.JsonObject,
    status: finished ? "finished" : "playing",
    positionStartedAt: finished ? null : new Date(),
    revision: { increment: 1 },
  };
}

async function submitTierlistBallot(roomId: string, tierId: string | null) {
  const user = await identity();
  if (!user) return { ok: false as const, error: "Connexion requise." };
  if (tierId !== null && !DEFAULT_TIERS.some((tier) => tier.id === tierId)) {
    return { ok: false as const, error: "Rang invalide." };
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const room = await findRoomForVote(roomId);
    if (!room) return { ok: false as const, error: "Room introuvable." };
    if (room.status !== "playing")
      return { ok: false as const, error: "La partie n’est pas en cours." };
    const participants = normalizeParticipants(room.participants);
    if (!participants.some((participant) => participant.playerId === user.playerId)) {
      return { ok: false as const, error: "Rejoins la room avant de participer." };
    }
    if (!currentTrack(room)) return { ok: false as const, error: "Ce morceau n’est plus actif." };

    const ballots = normalizeTierlistBallots(room.ballots);
    const shouldResolveExpired = hasExpired(room);
    const nextBallots = shouldResolveExpired
      ? ballots
      : replacePlayerBallot(ballots, { playerId: user.playerId, tierId });
    const shouldResolve = shouldResolveExpired || nextBallots.length >= participants.length;
    const data = shouldResolve
      ? resolvedPositionData(room, nextBallots)
      : {
          ballots: nextBallots as unknown as Prisma.JsonArray,
          revision: { increment: 1 as const },
        };
    if (!data) return { ok: false as const, error: "Ce morceau n’est plus actif." };

    const updated = await prisma.tierlistRoom.updateMany({
      where: { id: roomId, revision: room.revision, status: "playing" },
      data,
    });
    if (updated.count === 1) return response(roomId);
  }

  return { ok: false as const, error: "La room a changé, réessaie." };
}

export async function voteTierlistRoom(roomId: string, tierId: string) {
  return submitTierlistBallot(roomId, tierId);
}

export async function skipTierlistVote(roomId: string) {
  return submitTierlistBallot(roomId, null);
}

export async function clearTierlistVote(roomId: string) {
  const user = await identity();
  if (!user) return { ok: false as const, error: "Connexion requise." };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const room = await findRoomForVote(roomId);
    if (!room) return { ok: false as const, error: "Room introuvable." };
    if (room.status !== "playing" || !currentTrack(room)) {
      return { ok: false as const, error: "Ce morceau n’est plus actif." };
    }
    if (hasExpired(room)) return { ok: false as const, error: "Le temps de vote est écoulé." };

    const participants = normalizeParticipants(room.participants);
    if (!participants.some((participant) => participant.playerId === user.playerId)) {
      return { ok: false as const, error: "Rejoins la room avant de participer." };
    }
    const ballots = normalizeTierlistBallots(room.ballots);
    if (!ballots.some((ballot) => ballot.playerId === user.playerId)) {
      return { ok: false as const, error: "Tu n’as pas encore voté pour ce morceau." };
    }

    const updated = await prisma.tierlistRoom.updateMany({
      where: { id: roomId, revision: room.revision, status: "playing" },
      data: {
        ballots: removePlayerBallot(ballots, user.playerId) as unknown as Prisma.JsonArray,
        revision: { increment: 1 },
      },
    });
    if (updated.count === 1) return response(roomId);
  }

  return { ok: false as const, error: "La room a changé, réessaie." };
}

export async function finishTierlistRound(roomId: string) {
  const user = await identity();
  if (!user) return { ok: false as const, error: "Connexion requise." };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const room = await findRoomForVote(roomId);
    if (!room) return { ok: false as const, error: "Room introuvable." };
    if (room.status !== "playing") return response(roomId);
    if (room.hostId !== user.playerId) {
      return { ok: false as const, error: "Seul l’hôte peut finir le tour." };
    }
    const data = resolvedPositionData(room, normalizeTierlistBallots(room.ballots));
    if (!data) return response(roomId);
    const updated = await prisma.tierlistRoom.updateMany({
      where: { id: roomId, revision: room.revision, status: "playing" },
      data,
    });
    if (updated.count === 1) return response(roomId);
  }

  return { ok: false as const, error: "La room a changé, réessaie." };
}

export async function expireTierlistRound(roomId: string) {
  const user = await identity();
  if (!user) return { ok: false as const, error: "Connexion requise." };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const room = await findRoomForVote(roomId);
    if (!room) return { ok: false as const, error: "Room introuvable." };
    if (room.status !== "playing") return response(roomId);
    if (
      !normalizeParticipants(room.participants).some(
        (participant) => participant.playerId === user.playerId,
      )
    ) {
      return { ok: false as const, error: "Rejoins la room avant de continuer." };
    }
    if (!hasExpired(room)) {
      return { ok: false as const, error: "Le temps de vote n’est pas encore écoulé." };
    }
    const data = resolvedPositionData(room, normalizeTierlistBallots(room.ballots));
    if (!data) return response(roomId);
    const updated = await prisma.tierlistRoom.updateMany({
      where: { id: roomId, revision: room.revision, status: "playing" },
      data,
    });
    if (updated.count === 1) return response(roomId);
  }

  return response(roomId);
}
