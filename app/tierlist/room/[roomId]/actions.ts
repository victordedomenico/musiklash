"use server";

import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { resolvePlayerIdentity } from "@/lib/guest";
import { BRACKET_DUEL_SECONDS } from "@/lib/bracket-room-rules";
import { removePlayerBallot, replacePlayerBallot } from "@/lib/room-ballots";
import { resolveTierlistBallots } from "@/lib/tierlist-room-rules";
import { resolveCollaborativeRoomAfkParticipants } from "@/lib/collaborative-room-afk";
import {
  getTierlistRoomSnapshot,
  normalizeExcludedPlayerIds,
  normalizeRoomActionCounts,
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
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const room = await prisma.tierlistRoom.findUnique({ where: { id: roomId } });
    if (!room) return { ok: false as const, error: "Room introuvable." };
    if (room.status === "finished") return { ok: false as const, error: "La partie est terminée." };
    if (normalizeExcludedPlayerIds(room.excludedPlayerIds).includes(user.playerId)) {
      return { ok: false as const, error: "Vous avez été exclu de cette room." };
    }
    if (normalizeExcludedPlayerIds(room.rejectedPlayerIds).includes(user.playerId)) {
      return { ok: false as const, error: "Votre demande d’accès a été refusée." };
    }

    const participants = normalizeParticipants(room.participants);
    if (participants.some((participant) => participant.playerId === user.playerId))
      return response(roomId);
    const pendingParticipants = normalizeParticipants(room.pendingParticipants);
    const isReturningHost = room.hostId === user.playerId && room.previousHostId === user.playerId;
    if (!isReturningHost && room.status !== "waiting" && room.status !== "playing") {
      return { ok: false as const, error: "La partie a déjà commencé." };
    }
    if (
      !isReturningHost &&
      pendingParticipants.some((participant) => participant.playerId === user.playerId)
    ) {
      return response(roomId);
    }

    const updated = await prisma.tierlistRoom.updateMany({
      where: { id: roomId, revision: room.revision, status: room.status },
      data: {
        ...(isReturningHost
          ? {
              participants: [
                ...participants,
                { playerId: user.playerId, username: user.username },
              ] as unknown as Prisma.JsonArray,
              pendingParticipants: pendingParticipants.filter(
                (participant) => participant.playerId !== user.playerId,
              ) as unknown as Prisma.JsonArray,
              previousHostId: null,
            }
          : {
              pendingParticipants: [
                ...pendingParticipants,
                { playerId: user.playerId, username: user.username },
              ] as unknown as Prisma.JsonArray,
            }),
        revision: { increment: 1 },
      },
    });
    if (updated.count === 1) return response(roomId);
  }

  return { ok: false as const, error: "La room a changé, réessaie." };
}

/**
 * Removes the current player when their game tab is closed. Unlike a host kick,
 * the host is allowed to leave: the oldest remaining player becomes host.
 */
export async function leaveTierlistRoom(roomId: string) {
  const user = await identity();
  if (!user) return { ok: false as const, error: "Connexion requise." };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const room = await findRoomForVote(roomId);
    if (!room) return { ok: true as const };
    if (room.status === "finished") return { ok: true as const };

    const participants = normalizeParticipants(room.participants);
    if (!participants.some((participant) => participant.playerId === user.playerId)) {
      const pendingParticipants = normalizeParticipants(room.pendingParticipants);
      if (pendingParticipants.some((participant) => participant.playerId === user.playerId)) {
        const updated = await prisma.tierlistRoom.updateMany({
          where: { id: roomId, revision: room.revision, status: room.status },
          data: {
            pendingParticipants: pendingParticipants.filter(
              (participant) => participant.playerId !== user.playerId,
            ) as unknown as Prisma.JsonArray,
            revision: { increment: 1 },
          },
        });
        if (updated.count === 1) return { ok: true as const };
        continue;
      }
      return { ok: true as const };
    }

    const nextParticipants = participants.filter(
      (participant) => participant.playerId !== user.playerId,
    );
    if (nextParticipants.length === 0) {
      const canRejoin = room.hostId === user.playerId || room.previousHostId !== null;
      if (canRejoin) {
        const updated = await prisma.tierlistRoom.updateMany({
          where: { id: roomId, revision: room.revision, status: room.status },
          data: {
            participants: [] as Prisma.JsonArray,
            ballots: [] as Prisma.JsonArray,
            ...(room.hostId === user.playerId && room.previousHostId === null
              ? { previousHostId: user.playerId }
              : {}),
            revision: { increment: 1 },
          },
        });
        if (updated.count === 1) return { ok: true as const };
        continue;
      }
      const deleted = await prisma.tierlistRoom.deleteMany({
        where: { id: roomId, revision: room.revision, status: room.status },
      });
      if (deleted.count === 1) return { ok: true as const };
      continue;
    }

    const nextBallots = removePlayerBallot(normalizeTierlistBallots(room.ballots), user.playerId);
    const resolutionData =
      room.status === "playing" &&
      currentTrack(room) &&
      (hasExpired(room) || nextBallots.length >= nextParticipants.length)
        ? resolvedPositionData(room, nextBallots, nextParticipants)
        : null;
    const nextHost = room.hostId === user.playerId ? nextParticipants[0] : null;
    const data = resolutionData
      ? {
          ...resolutionData,
          ...(nextHost
            ? {
                hostId: nextHost.playerId,
                previousHostId: room.previousHostId ?? user.playerId,
              }
            : {}),
        }
      : {
          participants: nextParticipants as unknown as Prisma.JsonArray,
          ballots: nextBallots as unknown as Prisma.JsonArray,
          ...(nextHost
            ? {
                hostId: nextHost.playerId,
                previousHostId: room.previousHostId ?? user.playerId,
              }
            : {}),
          revision: { increment: 1 as const },
        };
    const updated = await prisma.tierlistRoom.updateMany({
      where: { id: roomId, revision: room.revision, status: room.status },
      data,
    });
    if (updated.count === 1) return { ok: true as const };
  }

  return { ok: false as const, error: "La room a changé, réessaie." };
}

export async function approveTierlistJoinRequest(roomId: string, playerId: string) {
  const user = await identity();
  if (!user) return { ok: false as const, error: "Connexion requise." };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const room = await prisma.tierlistRoom.findUnique({ where: { id: roomId } });
    if (!room) return { ok: false as const, error: "Room introuvable." };
    if (room.hostId !== user.playerId) {
      return { ok: false as const, error: "Seul l’hôte peut accepter un joueur." };
    }
    if (room.status !== "waiting" && room.status !== "playing") {
      return { ok: false as const, error: "La partie ne peut pas accueillir de joueur." };
    }

    const pendingParticipants = normalizeParticipants(room.pendingParticipants);
    const player = pendingParticipants.find((candidate) => candidate.playerId === playerId);
    if (!player) return { ok: false as const, error: "Cette demande n’est plus en attente." };
    const participants = normalizeParticipants(room.participants);
    const updated = await prisma.tierlistRoom.updateMany({
      where: { id: roomId, revision: room.revision, status: room.status },
      data: {
        participants: [...participants, player] as unknown as Prisma.JsonArray,
        pendingParticipants: pendingParticipants.filter(
          (candidate) => candidate.playerId !== playerId,
        ) as unknown as Prisma.JsonArray,
        missedVoteCounts: Object.fromEntries(
          Object.entries(normalizeRoomActionCounts(room.missedVoteCounts)).filter(
            ([candidatePlayerId]) => candidatePlayerId !== playerId,
          ),
        ) as unknown as Prisma.JsonObject,
        revision: { increment: 1 },
      },
    });
    if (updated.count === 1) return response(roomId);
  }

  return { ok: false as const, error: "La room a changé, réessaie." };
}

export async function rejectTierlistJoinRequest(roomId: string, playerId: string) {
  const user = await identity();
  if (!user) return { ok: false as const, error: "Connexion requise." };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const room = await prisma.tierlistRoom.findUnique({ where: { id: roomId } });
    if (!room) return { ok: false as const, error: "Room introuvable." };
    if (room.hostId !== user.playerId) {
      return { ok: false as const, error: "Seul l’hôte peut refuser un joueur." };
    }
    if (room.status !== "waiting" && room.status !== "playing") {
      return { ok: false as const, error: "La partie ne peut pas accueillir de joueur." };
    }

    const pendingParticipants = normalizeParticipants(room.pendingParticipants);
    if (!pendingParticipants.some((candidate) => candidate.playerId === playerId)) {
      return { ok: false as const, error: "Cette demande n’est plus en attente." };
    }
    const rejectionCounts = normalizeRoomActionCounts(room.rejectionCounts);
    const rejectionCount = (rejectionCounts[playerId] ?? 0) + 1;
    const rejectedPlayerIds =
      rejectionCount >= 3
        ? [...new Set([...normalizeExcludedPlayerIds(room.rejectedPlayerIds), playerId])]
        : normalizeExcludedPlayerIds(room.rejectedPlayerIds);
    const updated = await prisma.tierlistRoom.updateMany({
      where: { id: roomId, revision: room.revision, status: room.status },
      data: {
        pendingParticipants: pendingParticipants.filter(
          (candidate) => candidate.playerId !== playerId,
        ) as unknown as Prisma.JsonArray,
        rejectedPlayerIds: rejectedPlayerIds as unknown as Prisma.JsonArray,
        rejectionCounts: {
          ...rejectionCounts,
          [playerId]: rejectionCount,
        } as unknown as Prisma.JsonObject,
        revision: { increment: 1 },
      },
    });
    if (updated.count === 1) return response(roomId);
  }

  return { ok: false as const, error: "La room a changé, réessaie." };
}

export async function kickTierlistPlayer(roomId: string, playerId: string) {
  const user = await identity();
  if (!user) return { ok: false as const, error: "Connexion requise." };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const room = await findRoomForVote(roomId);
    if (!room) return { ok: false as const, error: "Room introuvable." };
    if (room.hostId !== user.playerId) {
      return { ok: false as const, error: "Seul l’hôte peut retirer un joueur." };
    }
    if (room.status === "finished") {
      return { ok: false as const, error: "La partie est déjà terminée." };
    }
    if (playerId === room.hostId) {
      return { ok: false as const, error: "L’hôte ne peut pas être retiré." };
    }

    const participants = normalizeParticipants(room.participants);
    if (!participants.some((participant) => participant.playerId === playerId)) {
      return { ok: false as const, error: "Ce joueur ne fait plus partie de la room." };
    }
    const nextParticipants = participants.filter(
      (participant) => participant.playerId !== playerId,
    );
    if (room.status === "playing" && nextParticipants.length < 2) {
      return { ok: false as const, error: "Une partie en cours doit garder au moins 2 joueurs." };
    }

    const nextBallots = removePlayerBallot(normalizeTierlistBallots(room.ballots), playerId);
    const kickCounts = normalizeRoomActionCounts(room.kickCounts);
    const kickCount = (kickCounts[playerId] ?? 0) + 1;
    const excludedPlayerIds =
      kickCount >= 3
        ? [...new Set([...normalizeExcludedPlayerIds(room.excludedPlayerIds), playerId])]
        : normalizeExcludedPlayerIds(room.excludedPlayerIds);
    const resolutionData =
      room.status === "playing" &&
      currentTrack(room) &&
      (hasExpired(room) || nextBallots.length >= nextParticipants.length)
        ? resolvedPositionData(room, nextBallots, nextParticipants)
        : null;
    const data = resolutionData
      ? {
          ...resolutionData,
          excludedPlayerIds: excludedPlayerIds as unknown as Prisma.JsonArray,
          kickCounts: { ...kickCounts, [playerId]: kickCount } as unknown as Prisma.JsonObject,
        }
      : {
          participants: nextParticipants as unknown as Prisma.JsonArray,
          ballots: nextBallots as unknown as Prisma.JsonArray,
          excludedPlayerIds: excludedPlayerIds as unknown as Prisma.JsonArray,
          kickCounts: { ...kickCounts, [playerId]: kickCount } as unknown as Prisma.JsonObject,
          revision: { increment: 1 as const },
        };

    const updated = await prisma.tierlistRoom.updateMany({
      where: { id: roomId, revision: room.revision, status: room.status },
      data,
    });
    if (updated.count === 1) return response(roomId);
  }

  return { ok: false as const, error: "La room a changé, réessaie." };
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
      missedVoteCounts: {},
      lastResolution: Prisma.DbNull,
      positionStartedAt: room.timerEnabled ? new Date() : null,
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
  if (!room.timerEnabled) return false;
  const startedAt = room.positionStartedAt ?? (room.status === "playing" ? room.updatedAt : null);
  return Boolean(startedAt && Date.now() >= startedAt.getTime() + BRACKET_DUEL_SECONDS * 1000);
}

function resolvedPositionData(
  room: TierlistVoteRoom,
  ballots: TierlistBallot[],
  activeParticipants = normalizeParticipants(room.participants),
) {
  const track = currentTrack(room);
  if (!track) return null;
  const resolution = resolveTierlistBallots(ballots);
  const placements = normalizePlacements(room.placements);
  const nextPlacements = { ...placements, [String(room.currentPosition)]: resolution.tierId };
  const positions = room.tierlist.tracks.map((candidate) => candidate.position);
  const currentIndex = positions.indexOf(room.currentPosition);
  const finished = currentIndex === -1 || currentIndex >= positions.length - 1;
  const nextPosition = positions[currentIndex + 1] ?? room.currentPosition;
  const afk = resolveCollaborativeRoomAfkParticipants(
    activeParticipants,
    ballots,
    normalizeRoomActionCounts(room.missedVoteCounts),
  );
  const hasActiveHost = afk.participants.some(
    (participant) => participant.playerId === room.hostId,
  );
  const nextHost = hasActiveHost ? null : (afk.participants[0] ?? null);

  return {
    placements: nextPlacements as unknown as Prisma.JsonObject,
    ballots: [] as Prisma.JsonArray,
    participants: afk.participants as unknown as Prisma.JsonArray,
    missedVoteCounts: afk.missedVoteCounts as unknown as Prisma.JsonObject,
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
      afkPlayerIds: afk.removedPlayerIds,
      resolvedAt: new Date().toISOString(),
    } as unknown as Prisma.JsonObject,
    status: finished ? "finished" : "playing",
    positionStartedAt: finished || !room.timerEnabled ? null : new Date(),
    ...(nextHost
      ? {
          hostId: nextHost.playerId,
          previousHostId: room.previousHostId ?? room.hostId,
        }
      : !hasActiveHost
        ? { previousHostId: room.previousHostId ?? room.hostId }
        : {}),
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
