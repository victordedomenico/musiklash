"use server";

import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { resolvePlayerIdentity } from "@/lib/guest";
import { BRACKET_DUEL_SECONDS } from "@/lib/bracket-room-rules";
import { removePlayerBallot, replacePlayerBallot } from "@/lib/room-ballots";
import { z } from "zod";
import { MAX_BRACKET_TRACKS } from "@/lib/bracket";
import { resolveTierlistBallots, planTierlistRoomTrackEdit } from "@/lib/tierlist-room-rules";
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
import { roomTierConfig, getNextTierColor } from "@/lib/tierlist-tiers";

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
    // The original host may come back after a refresh/disconnect even though the
    // host role was temporarily handed to another player: they reclaim it.
    const isReturningHost = room.previousHostId === user.playerId;
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
              hostId: user.playerId,
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

    const nextBallots = removePlayerBallot(
      normalizeTierlistBallots(room.ballots, roomTierConfig(room.placements)),
      user.playerId,
    );
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

    const nextBallots = removePlayerBallot(
      normalizeTierlistBallots(room.ballots, roomTierConfig(room.placements)),
      playerId,
    );
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
    include: {
      tierlist: {
        select: { tracks: { where: { archived: false }, orderBy: { position: "asc" }, take: 1 } },
      },
    },
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
  const started = await prisma.tierlistRoom.updateMany({
    where: { id: roomId, revision: room.revision, status: "waiting" },
    data: {
      status: "playing",
      currentPosition: firstTrack.position,
      placements: { __tiers: roomTierConfig(room.placements) } as unknown as Prisma.JsonObject,
      ballots: [],
      missedVoteCounts: {},
      lastResolution: Prisma.DbNull,
      positionStartedAt: room.timerEnabled ? new Date() : null,
      revision: { increment: 1 },
    },
  });
  if (started.count !== 1) return { ok: false as const, error: "La room a changé, réessaie." };
  return response(roomId);
}

async function findRoomForVote(roomId: string) {
  return prisma.tierlistRoom.findUnique({
    where: { id: roomId },
    include: {
      tierlist: {
        select: { tracks: { where: { archived: false }, orderBy: { position: "asc" } } },
      },
    },
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
  const tiers = roomTierConfig(room.placements);
  const resolution = resolveTierlistBallots(ballots, tiers);
  const placements = normalizePlacements(room.placements, tiers);
  const nextPlacements = { ...placements };
  if (resolution.tierId !== null) nextPlacements[String(room.currentPosition)] = resolution.tierId;
  else delete nextPlacements[String(room.currentPosition)];
  const metadata = room.placements as Record<string, unknown>;
  const resume = metadata?.__resume as { position: number; finished: boolean } | undefined;
  const positions = room.tierlist.tracks.map((candidate) => candidate.position);
  const currentIndex = positions.indexOf(room.currentPosition);
  const finished = resume
    ? resume.finished
    : currentIndex === -1 || currentIndex >= positions.length - 1;
  const nextPosition = resume
    ? resume.position
    : (positions[currentIndex + 1] ?? room.currentPosition);
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
    placements: { ...nextPlacements, __tiers: tiers } as unknown as Prisma.JsonObject,
    ballots: [] as Prisma.JsonArray,
    participants: afk.participants as unknown as Prisma.JsonArray,
    missedVoteCounts: afk.missedVoteCounts as unknown as Prisma.JsonObject,
    currentPosition: nextPosition,
    lastResolution: {
      id: `${room.currentPosition}:${room.revision}`,
      position: room.currentPosition,
      tierId: resolution.tierId,
      votesByTier: resolution.votesByTier,
      skippedCount: resolution.skippedCount,
      tie: resolution.tie,
      coinSide: null,
      pileTierId: null,
      faceTierId: null,
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

async function submitTierlistBallot(roomId: string, tierId: string | null, position: number) {
  const user = await identity();
  if (!user) return { ok: false as const, error: "Connexion requise." };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const room = await findRoomForVote(roomId);
    if (!room) return { ok: false as const, error: "Room introuvable." };
    if (room.status !== "playing")
      return { ok: false as const, error: "La partie n’est pas en cours." };
    if (tierId !== null && !roomTierConfig(room.placements).some((tier) => tier.id === tierId))
      return { ok: false as const, error: "Rang invalide." };
    const participants = normalizeParticipants(room.participants);
    if (!participants.some((participant) => participant.playerId === user.playerId)) {
      return { ok: false as const, error: "Rejoins la room avant de participer." };
    }
    if (!currentTrack(room) || room.currentPosition !== position)
      return { ok: false as const, error: "Ce morceau n’est plus actif." };

    const ballots = normalizeTierlistBallots(room.ballots, roomTierConfig(room.placements));
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

export async function voteTierlistRoom(roomId: string, tierId: string, position: number) {
  return submitTierlistBallot(roomId, tierId, position);
}

export async function skipTierlistVote(roomId: string, position: number) {
  return submitTierlistBallot(roomId, null, position);
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
    const ballots = normalizeTierlistBallots(room.ballots, roomTierConfig(room.placements));
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
    const data = resolvedPositionData(
      room,
      normalizeTierlistBallots(room.ballots, roomTierConfig(room.placements)),
    );
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
    const data = resolvedPositionData(
      room,
      normalizeTierlistBallots(room.ballots, roomTierConfig(room.placements)),
    );
    if (!data) return response(roomId);
    const updated = await prisma.tierlistRoom.updateMany({
      where: { id: roomId, revision: room.revision, status: "playing" },
      data,
    });
    if (updated.count === 1) return response(roomId);
  }

  return response(roomId);
}

type TierEdit =
  | { kind: "add"; index?: number }
  | { kind: "label"; id: string; value: string }
  | { kind: "color"; id: string; value: string }
  | { kind: "move"; id: string; direction: "up" | "down" }
  | { kind: "delete"; id: string };

export async function editTierlistRoomTiers(roomId: string, edit: TierEdit) {
  const user = await identity();
  if (!user) return { ok: false as const, error: "Connexion requise." };
  for (let attempt = 0; attempt < 3; attempt++) {
    const room = await findRoomForVote(roomId);
    if (!room) return { ok: false as const, error: "Room introuvable." };
    if (
      room.hostId !== user.playerId ||
      !normalizeParticipants(room.participants).some((p) => p.playerId === user.playerId)
    )
      return { ok: false as const, error: "Seul l’hôte peut modifier les lignes." };
    if (!edit || typeof edit !== "object")
      return { ok: false as const, error: "Modification invalide." };
    const tiers = roomTierConfig(room.placements).map((t) => ({ ...t }));
    const index = "id" in edit ? tiers.findIndex((t) => t.id === edit.id) : -1;
    if (edit.kind === "add") {
      if (tiers.length >= 30) return { ok: false as const, error: "30 lignes maximum." };
      let n = 1;
      while (tiers.some((t) => t.id === `tier-${n}`)) n++;
      const at =
        typeof edit.index === "number" && Number.isInteger(edit.index)
          ? Math.min(Math.max(edit.index, 0), tiers.length)
          : tiers.length;
      tiers.splice(at, 0, {
        id: `tier-${n}`,
        label: `Tier ${n}`,
        color: getNextTierColor(n - 1),
      });
    } else if (index < 0) return { ok: false as const, error: "Ligne introuvable." };
    else if (edit.kind === "label") {
      if (typeof edit.value !== "string" || edit.value.length > 40)
        return { ok: false as const, error: "Titre invalide." };
      tiers[index].label = edit.value;
    } else if (edit.kind === "color") {
      if (typeof edit.value !== "string" || !/^#[\da-f]{6}$/i.test(edit.value))
        return { ok: false as const, error: "Couleur invalide." };
      tiers[index].color = edit.value;
    } else if (edit.kind === "move") {
      if (edit.direction !== "up" && edit.direction !== "down")
        return { ok: false as const, error: "Déplacement invalide." };
      const target = index + (edit.direction === "up" ? -1 : 1);
      if (target < 0 || target >= tiers.length) return response(roomId);
      [tiers[index], tiers[target]] = [tiers[target], tiers[index]];
    } else if (edit.kind === "delete") {
      if (tiers.length === 1) return { ok: false as const, error: "Il faut conserver une ligne." };
      if (
        Object.values(normalizePlacements(room.placements, tiers)).includes(edit.id) ||
        normalizeTierlistBallots(room.ballots, tiers).some((b) => b.tierId === edit.id)
      )
        return {
          ok: false as const,
          error:
            "Cette ligne contient des morceaux ou des votes. Déplace-les avant de la supprimer.",
        };
      tiers.splice(index, 1);
    } else return { ok: false as const, error: "Modification invalide." };
    const existing =
      room.placements && typeof room.placements === "object" && !Array.isArray(room.placements)
        ? room.placements
        : {};
    const updated = await prisma.tierlistRoom.updateMany({
      where: { id: roomId, revision: room.revision },
      data: {
        placements: { ...existing, __tiers: tiers } as unknown as Prisma.JsonObject,
        revision: { increment: 1 },
      },
    });
    if (updated.count) return response(roomId);
  }
  return { ok: false as const, error: "La room a changé, réessaie." };
}

export async function revoteTierlistTrack(roomId: string, position: number) {
  const user = await identity();
  if (!user) return { ok: false as const, error: "Connexion requise." };
  for (let attempt = 0; attempt < 3; attempt++) {
    const room = await findRoomForVote(roomId);
    if (!room) return { ok: false as const, error: "Room introuvable." };
    if (!normalizeParticipants(room.participants).some((p) => p.playerId === user.playerId))
      return { ok: false as const, error: "Rejoins la room avant de participer." };
    const tiers = roomTierConfig(room.placements);
    const placements = normalizePlacements(room.placements, tiers);
    const metadata = room.placements as Record<string, unknown>;
    if (
      !Number.isInteger(position) ||
      !room.tierlist.tracks.some((t) => t.position === position) ||
      (!placements[String(position)] &&
        !(
          room.status === "finished" ||
          (room.status === "playing" && position < room.currentPosition)
        ))
    )
      return { ok: false as const, error: "Ce morceau n’est pas classé." };
    if (
      (room.status !== "playing" && room.status !== "finished") ||
      metadata?.__resume ||
      (room.status === "playing" && hasExpired(room)) ||
      normalizeTierlistBallots(room.ballots, tiers).length
    )
      return {
        ok: false as const,
        error: "Attends la fin du vote en cours avant de relancer un vote.",
      };
    delete placements[String(position)];
    const updated = await prisma.tierlistRoom.updateMany({
      where: { id: roomId, revision: room.revision, status: room.status },
      data: {
        placements: {
          ...placements,
          __tiers: tiers,
          __resume: { position: room.currentPosition, finished: room.status === "finished" },
        } as unknown as Prisma.JsonObject,
        currentPosition: position,
        status: "playing",
        ballots: [],
        lastResolution: Prisma.DbNull,
        positionStartedAt: room.timerEnabled ? new Date() : null,
        revision: { increment: 1 },
      },
    });
    if (updated.count) return response(roomId);
  }
  return { ok: false as const, error: "La room a changé, réessaie." };
}

const roomTrackSchema = z
  .array(
    z.object({
      deezer_track_id: z.number().int().positive().safe(),
      title: z.string().trim().min(1).max(300),
      artist: z.string().trim().min(1).max(300),
      cover_url: z.string().url().max(2048).nullable(),
    }),
  )
  .min(2)
  .max(MAX_BRACKET_TRACKS);

export async function editTierlistRoomTracks(
  roomId: string,
  originalPositions: number[],
  input: unknown,
) {
  const parsed = roomTrackSchema.safeParse(input);
  if (
    !parsed.success ||
    !Array.isArray(originalPositions) ||
    !originalPositions.every(Number.isInteger) ||
    new Set(parsed.data.map((track) => track.deezer_track_id)).size !== parsed.data.length
  ) {
    return { ok: false as const, error: "Sélection de morceaux invalide." };
  }
  const user = await identity();
  if (!user) return { ok: false as const, error: "Connexion requise." };
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const room = await tx.tierlistRoom.findUnique({
          where: { id: roomId },
          include: {
            tierlist: {
              include: {
                tracks: { orderBy: { position: "asc" } },
                _count: { select: { rooms: true } },
              },
            },
          },
        });
        if (!room) return { error: "Room introuvable." };
        if (
          room.hostId !== user.playerId ||
          !normalizeParticipants(room.participants).some((p) => p.playerId === user.playerId)
        )
          return { error: "Seul l’hôte peut modifier les morceaux." };
        if (room.status !== "waiting" && room.status !== "playing" && room.status !== "finished")
          return { error: "État de la room invalide." };
        if (room.tierlist._count.rooms !== 1)
          return {
            error: "Cette tierlist est utilisée par plusieurs rooms et ne peut pas être modifiée.",
          };
        const active = room.tierlist.tracks.filter((track) => !track.archived);
        if (active.map((track) => track.position).join(",") !== originalPositions.join(","))
          return { error: "La sélection a changé. Recharge la room et réessaie." };
        const selectedIds = new Set(parsed.data.map((track) => track.deezer_track_id));
        const removed = active.filter((track) => !selectedIds.has(Number(track.deezerTrackId)));
        const existing = new Set(active.map((track) => Number(track.deezerTrackId)));
        const added = parsed.data.filter((track) => !existing.has(track.deezer_track_id));
        let position = room.tierlist.tracks.reduce(
          (max, track) => Math.max(max, track.position),
          -1,
        );
        if (position + added.length > 32767)
          return { error: "Cette tierlist ne peut plus recevoir de morceaux." };
        const newTracks = added.map((track) => ({
          tierlistId: room.tierlistId,
          position: ++position,
          deezerTrackId: BigInt(track.deezer_track_id),
          title: track.title,
          artist: track.artist,
          coverUrl: track.cover_url,
          previewUrl: "",
        }));
        const retainedPositions = active
          .filter((track) => selectedIds.has(Number(track.deezerTrackId)))
          .map((track) => track.position);
        const tiers = roomTierConfig(room.placements);
        const metadata = room.placements as Record<string, unknown> | null;
        const rawResume = metadata?.__resume;
        const resume =
          rawResume &&
          typeof rawResume === "object" &&
          Number.isInteger((rawResume as { position?: unknown }).position) &&
          typeof (rawResume as { finished?: unknown }).finished === "boolean"
            ? (rawResume as { position: number; finished: boolean })
            : undefined;
        const plan = planTierlistRoomTrackEdit(
          room.status,
          normalizePlacements(room.placements, tiers),
          [...retainedPositions, ...newTracks.map((track) => track.position)],
          newTracks[0]?.position,
          room.currentPosition,
          resume,
        );
        const updated = await tx.tierlistRoom.updateMany({
          where: {
            id: roomId,
            revision: room.revision,
            status: room.status,
            hostId: user.playerId,
          },
          data: {
            placements: {
              ...plan.placements,
              __tiers: tiers,
              ...(plan.resume ? { __resume: plan.resume } : {}),
            } as unknown as Prisma.JsonObject,
            status: plan.status,
            currentPosition: plan.currentPosition,
            ...(plan.resetVote
              ? {
                  ballots: [],
                  lastResolution: Prisma.DbNull,
                  positionStartedAt:
                    plan.status === "playing" && room.timerEnabled ? new Date() : null,
                }
              : {}),
            revision: { increment: 1 },
          },
        });
        if (updated.count !== 1) throw new Error("Concurrent update");
        if (removed.length)
          await tx.tierlistTrack.updateMany({
            where: {
              tierlistId: room.tierlistId,
              position: { in: removed.map((track) => track.position) },
            },
            data: { archived: true },
          });
        if (newTracks.length) await tx.tierlistTrack.createMany({ data: newTracks });
        return { ok: true as const };
      },
      { isolationLevel: "Serializable" },
    );
    if ("error" in result) return { ok: false as const, error: result.error };
    return response(roomId);
  } catch {
    return { ok: false as const, error: "La room a changé ou la modification a échoué. Réessaie." };
  }
}
