"use server";

import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { resolvePlayerIdentity } from "@/lib/guest";
import { buildBracketState, type Pairing } from "@/lib/bracket";
import { resolveBracketBallots } from "@/lib/bracket-room-rules";
import { removePlayerBallot, replacePlayerBallot } from "@/lib/room-ballots";
import {
  getBracketRoomSnapshot,
  normalizeBracketBallots,
  normalizeExcludedPlayerIds,
  normalizeRoomActionCounts,
  normalizeParticipants,
  normalizeVotes,
  type BracketBallot,
} from "@/lib/collaborative-room";

async function identity() {
  try {
    return await resolvePlayerIdentity();
  } catch {
    return null;
  }
}

async function response(roomId: string) {
  const room = await getBracketRoomSnapshot(roomId);
  return room ? { ok: true as const, room } : { ok: false as const, error: "Room introuvable." };
}

const HOST_HEARTBEAT_GRACE_MS = 45_000;

async function pauseBracketRoomWhenHostIsInactive(roomId: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const room = await prisma.bracketRoom.findUnique({ where: { id: roomId } });
    if (!room || room.status !== "playing") return;
    if (Date.now() - room.hostLastSeenAt.getTime() < HOST_HEARTBEAT_GRACE_MS) return;

    const updated = await prisma.bracketRoom.updateMany({
      where: { id: roomId, revision: room.revision, status: "playing" },
      data: {
        status: "paused",
        previousHostId: room.hostId,
        revision: { increment: 1 },
      },
    });
    if (updated.count === 1) return;
  }
}

export async function refreshBracketRoom(roomId: string) {
  await pauseBracketRoomWhenHostIsInactive(roomId);
  return response(roomId);
}

/** Records that the actual host still has an open game page and resumes a paused room on return. */
export async function heartbeatBracketHost(roomId: string) {
  const user = await identity();
  if (!user) return { ok: false as const, error: "Connexion requise." };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const room = await prisma.bracketRoom.findUnique({ where: { id: roomId } });
    if (!room) return { ok: false as const, error: "Room introuvable." };
    if (room.hostId !== user.playerId) return response(roomId);
    if (room.status === "finished") return response(roomId);

    const updated = await prisma.bracketRoom.updateMany({
      where: { id: roomId, revision: room.revision, hostId: user.playerId },
      data: {
        hostLastSeenAt: new Date(),
        ...(room.status === "paused" && room.previousHostId === user.playerId
          ? { status: "playing", previousHostId: null }
          : {}),
        revision: { increment: 1 },
      },
    });
    if (updated.count === 1) return response(roomId);
  }

  return { ok: false as const, error: "La room a changé, réessaie." };
}

export async function joinBracketRoom(roomId: string) {
  const user = await identity();
  if (!user) return { ok: false as const, error: "Connexion requise." };
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const room = await prisma.bracketRoom.findUnique({ where: { id: roomId } });
    if (!room) return { ok: false as const, error: "Room introuvable." };
    if (room.status === "finished") {
      return { ok: false as const, error: "La partie est terminée." };
    }

    const participants = normalizeParticipants(room.participants);
    const pendingParticipants = normalizeParticipants(room.pendingParticipants);
    if (normalizeExcludedPlayerIds(room.excludedPlayerIds).includes(user.playerId)) {
      return { ok: false as const, error: "Vous avez été exclu de cette room." };
    }
    if (normalizeExcludedPlayerIds(room.rejectedPlayerIds).includes(user.playerId)) {
      return { ok: false as const, error: "Votre demande d’accès a été refusée." };
    }
    if (participants.some((participant) => participant.playerId === user.playerId)) {
      return response(roomId);
    }

    const isReturningHost = room.hostId === user.playerId && room.previousHostId === user.playerId;
    if (!isReturningHost && room.status !== "waiting") {
      return { ok: false as const, error: "La partie a déjà commencé." };
    }
    if (
      !isReturningHost &&
      pendingParticipants.some((player) => player.playerId === user.playerId)
    ) {
      return response(roomId);
    }
    const updated = await prisma.bracketRoom.updateMany({
      where: { id: roomId, revision: room.revision, status: room.status },
      data: {
        ...(isReturningHost
          ? {
              participants: [
                ...participants,
                { playerId: user.playerId, username: user.username },
              ] as unknown as Prisma.JsonArray,
              pendingParticipants: pendingParticipants.filter(
                (player) => player.playerId !== user.playerId,
              ) as unknown as Prisma.JsonArray,
              previousHostId: null,
              ...(room.status === "paused" ? { status: "playing" } : {}),
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

/** Removes the current player when their game tab is closed. */
export async function leaveBracketRoom(roomId: string) {
  const user = await identity();
  if (!user) return { ok: false as const, error: "Connexion requise." };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const room = await findRoomForDuel(roomId);
    if (!room) return { ok: true as const };
    if (room.status === "finished") return { ok: true as const };

    const participants = normalizeParticipants(room.participants);
    if (!participants.some((participant) => participant.playerId === user.playerId)) {
      const pendingParticipants = normalizeParticipants(room.pendingParticipants);
      if (pendingParticipants.some((participant) => participant.playerId === user.playerId)) {
        const updated = await prisma.bracketRoom.updateMany({
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
    const nextBallots = removePlayerBallot(normalizeBracketBallots(room.ballots), user.playerId);

    if (room.hostId === user.playerId) {
      const updated = await prisma.bracketRoom.updateMany({
        where: { id: roomId, revision: room.revision, status: room.status },
        data: {
          participants: nextParticipants as unknown as Prisma.JsonArray,
          ballots: nextBallots as unknown as Prisma.JsonArray,
          previousHostId: user.playerId,
          ...(room.status === "playing" ? { status: "paused" } : {}),
          revision: { increment: 1 },
        },
      });
      if (updated.count === 1) return { ok: true as const };
      continue;
    }

    if (nextParticipants.length === 0) {
      if (room.previousHostId !== null) {
        const updated = await prisma.bracketRoom.updateMany({
          where: { id: roomId, revision: room.revision, status: room.status },
          data: {
            participants: [] as Prisma.JsonArray,
            ballots: [] as Prisma.JsonArray,
            revision: { increment: 1 },
          },
        });
        if (updated.count === 1) return { ok: true as const };
        continue;
      }
      const deleted = await prisma.bracketRoom.deleteMany({
        where: { id: roomId, revision: room.revision, status: room.status },
      });
      if (deleted.count === 1) return { ok: true as const };
      continue;
    }

    const { votes, round, pair } = getOpenDuel(room);
    const resolutionData =
      room.status === "playing" && pair && nextBallots.length >= nextParticipants.length
        ? resolvedDuelData(room, nextBallots, pair, round, votes)
        : null;
    const data = resolutionData
      ? {
          ...resolutionData,
          participants: nextParticipants as unknown as Prisma.JsonArray,
        }
      : {
          participants: nextParticipants as unknown as Prisma.JsonArray,
          ballots: nextBallots as unknown as Prisma.JsonArray,
          revision: { increment: 1 as const },
        };
    const updated = await prisma.bracketRoom.updateMany({
      where: { id: roomId, revision: room.revision, status: room.status },
      data,
    });
    if (updated.count === 1) return { ok: true as const };
  }

  return { ok: false as const, error: "La room a changé, réessaie." };
}

export async function approveBracketJoinRequest(roomId: string, playerId: string) {
  const user = await identity();
  if (!user) return { ok: false as const, error: "Connexion requise." };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const room = await prisma.bracketRoom.findUnique({ where: { id: roomId } });
    if (!room) return { ok: false as const, error: "Room introuvable." };
    if (room.hostId !== user.playerId)
      return { ok: false as const, error: "Seul l’hôte peut accepter un joueur." };
    if (room.status !== "waiting")
      return { ok: false as const, error: "La partie a déjà commencé." };

    const pendingParticipants = normalizeParticipants(room.pendingParticipants);
    const player = pendingParticipants.find((candidate) => candidate.playerId === playerId);
    if (!player) return { ok: false as const, error: "Cette demande n’est plus en attente." };
    const participants = normalizeParticipants(room.participants);
    const updated = await prisma.bracketRoom.updateMany({
      where: { id: roomId, revision: room.revision, status: "waiting" },
      data: {
        participants: [...participants, player] as unknown as Prisma.JsonArray,
        pendingParticipants: pendingParticipants.filter(
          (candidate) => candidate.playerId !== playerId,
        ) as unknown as Prisma.JsonArray,
        revision: { increment: 1 },
      },
    });
    if (updated.count === 1) return response(roomId);
  }

  return { ok: false as const, error: "La room a changé, réessaie." };
}

export async function rejectBracketJoinRequest(roomId: string, playerId: string) {
  const user = await identity();
  if (!user) return { ok: false as const, error: "Connexion requise." };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const room = await prisma.bracketRoom.findUnique({ where: { id: roomId } });
    if (!room) return { ok: false as const, error: "Room introuvable." };
    if (room.hostId !== user.playerId)
      return { ok: false as const, error: "Seul l’hôte peut refuser un joueur." };
    if (room.status !== "waiting")
      return { ok: false as const, error: "La partie a déjà commencé." };

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
    const updated = await prisma.bracketRoom.updateMany({
      where: { id: roomId, revision: room.revision, status: "waiting" },
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

export async function kickBracketPlayer(roomId: string, playerId: string) {
  const user = await identity();
  if (!user) return { ok: false as const, error: "Connexion requise." };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const room = await findRoomForDuel(roomId);
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

    const nextBallots = removePlayerBallot(normalizeBracketBallots(room.ballots), playerId);
    const kickCounts = normalizeRoomActionCounts(room.kickCounts);
    const kickCount = (kickCounts[playerId] ?? 0) + 1;
    const excludedPlayerIds =
      kickCount >= 3
        ? [...new Set([...normalizeExcludedPlayerIds(room.excludedPlayerIds), playerId])]
        : normalizeExcludedPlayerIds(room.excludedPlayerIds);
    const { votes, round, pair } = getOpenDuel(room);
    const data =
      room.status === "playing" && pair && nextBallots.length >= nextParticipants.length
        ? {
            ...resolvedDuelData(room, nextBallots, pair, round, votes),
            participants: nextParticipants as unknown as Prisma.JsonArray,
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

    const updated = await prisma.bracketRoom.updateMany({
      where: { id: roomId, revision: room.revision, status: room.status },
      data,
    });
    if (updated.count === 1) return response(roomId);
  }

  return { ok: false as const, error: "La room a changé, réessaie." };
}

export async function startBracketRoom(roomId: string) {
  const user = await identity();
  if (!user) return { ok: false as const, error: "Connexion requise." };
  const room = await prisma.bracketRoom.findUnique({ where: { id: roomId } });
  if (!room) return { ok: false as const, error: "Room introuvable." };
  if (room.hostId !== user.playerId)
    return { ok: false as const, error: "Seul l’hôte peut lancer la partie." };
  if (room.status !== "waiting") return { ok: false as const, error: "La partie est déjà lancée." };
  if (normalizeParticipants(room.participants).length < 2) {
    return { ok: false as const, error: "Il faut au moins 2 joueurs." };
  }
  await prisma.bracketRoom.update({
    where: { id: roomId },
    data: {
      status: "playing",
      ballots: [],
      lastResolution: Prisma.DbNull,
      duelStartedAt: null,
      revision: { increment: 1 },
    },
  });
  return response(roomId);
}

async function findRoomForDuel(roomId: string) {
  return prisma.bracketRoom.findUnique({
    where: { id: roomId },
    include: { bracket: { include: { tracks: true } } },
  });
}

type DuelRoom = NonNullable<Awaited<ReturnType<typeof findRoomForDuel>>>;

function getOpenDuel(room: DuelRoom) {
  const votes = normalizeVotes(room.votes);
  const state = buildBracketState(
    room.bracket.size,
    votes,
    room.bracket.tracks.length,
    room.bracket.drawVersion,
  );
  const round = state.rounds.length;
  const pair =
    state.rounds
      .at(-1)
      ?.find(
        (candidate) =>
          candidate.seedB <= room.bracket.tracks.length &&
          !votes.some((vote) => vote.round === round && vote.matchIndex === candidate.matchIndex),
      ) ?? null;
  return { votes, round, pair };
}

function resolvedDuelData(
  room: DuelRoom,
  ballots: BracketBallot[],
  pair: Pairing,
  round: number,
  votes: ReturnType<typeof normalizeVotes>,
) {
  const resolution = resolveBracketBallots(ballots, pair.seedA, pair.seedB);
  const nextVotes = [
    ...votes,
    { round, matchIndex: pair.matchIndex, winnerSeed: resolution.winnerSeed },
  ];
  const state = buildBracketState(
    room.bracket.size,
    nextVotes,
    room.bracket.tracks.length,
    room.bracket.drawVersion,
  );

  return {
    votes: nextVotes as unknown as Prisma.JsonArray,
    ballots: [] as Prisma.JsonArray,
    lastResolution: {
      id: `${round}:${pair.matchIndex}:${nextVotes.length}`,
      round,
      matchIndex: pair.matchIndex,
      seedA: pair.seedA,
      seedB: pair.seedB,
      winnerSeed: resolution.winnerSeed,
      votesA: resolution.votesA,
      votesB: resolution.votesB,
      skippedCount: resolution.skippedCount,
      tie: resolution.tie,
      coinSide: resolution.coinSide,
      resolvedAt: new Date().toISOString(),
    } as unknown as Prisma.JsonObject,
    status: state.winner ? "finished" : "playing",
    winnerSeed: state.winner,
    duelStartedAt: null,
    revision: { increment: 1 },
  };
}

async function submitBracketBallot(roomId: string, winnerSeed: number | null) {
  const user = await identity();
  if (!user) return { ok: false as const, error: "Connexion requise." };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const room = await findRoomForDuel(roomId);
    if (!room) return { ok: false as const, error: "Room introuvable." };
    if (room.status !== "playing")
      return { ok: false as const, error: "La partie n’est pas en cours." };

    const participants = normalizeParticipants(room.participants);
    if (!participants.some((participant) => participant.playerId === user.playerId)) {
      return { ok: false as const, error: "Rejoins la room avant de participer." };
    }

    const { votes, round, pair } = getOpenDuel(room);
    if (!pair) return { ok: false as const, error: "Ce duel n’est plus actif." };
    if (winnerSeed !== null && winnerSeed !== pair.seedA && winnerSeed !== pair.seedB) {
      return { ok: false as const, error: "Ce duel n’est plus actif." };
    }

    const ballots = normalizeBracketBallots(room.ballots);
    const nextBallots = replacePlayerBallot(ballots, { playerId: user.playerId, winnerSeed });
    const shouldResolve = nextBallots.length >= participants.length;
    const data = shouldResolve
      ? resolvedDuelData(room, nextBallots, pair, round, votes)
      : {
          ballots: nextBallots as unknown as Prisma.JsonArray,
          revision: { increment: 1 as const },
        };

    const updated = await prisma.bracketRoom.updateMany({
      where: { id: roomId, revision: room.revision, status: "playing" },
      data,
    });
    if (updated.count === 1) return response(roomId);
  }

  return { ok: false as const, error: "La room a changé, réessaie." };
}

export async function voteBracketRoom(roomId: string, winnerSeed: number) {
  return submitBracketBallot(roomId, winnerSeed);
}

export async function skipBracketVote(roomId: string) {
  return submitBracketBallot(roomId, null);
}

export async function clearBracketVote(roomId: string) {
  const user = await identity();
  if (!user) return { ok: false as const, error: "Connexion requise." };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const room = await findRoomForDuel(roomId);
    if (!room) return { ok: false as const, error: "Room introuvable." };
    if (room.status !== "playing" || !getOpenDuel(room).pair) {
      return { ok: false as const, error: "Ce duel n’est plus actif." };
    }
    const participants = normalizeParticipants(room.participants);
    if (!participants.some((participant) => participant.playerId === user.playerId)) {
      return { ok: false as const, error: "Rejoins la room avant de participer." };
    }
    const ballots = normalizeBracketBallots(room.ballots);
    if (!ballots.some((ballot) => ballot.playerId === user.playerId)) {
      return { ok: false as const, error: "Tu n’as pas encore voté pour ce duel." };
    }

    const updated = await prisma.bracketRoom.updateMany({
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

export async function finishBracketRound(roomId: string) {
  const user = await identity();
  if (!user) return { ok: false as const, error: "Connexion requise." };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const room = await findRoomForDuel(roomId);
    if (!room) return { ok: false as const, error: "Room introuvable." };
    if (room.status !== "playing") return response(roomId);
    if (room.hostId !== user.playerId) {
      return { ok: false as const, error: "Seul l’hôte peut finir le tour." };
    }

    const { votes, round, pair } = getOpenDuel(room);
    if (!pair) return response(roomId);
    const updated = await prisma.bracketRoom.updateMany({
      where: { id: roomId, revision: room.revision, status: "playing" },
      data: resolvedDuelData(room, normalizeBracketBallots(room.ballots), pair, round, votes),
    });
    if (updated.count === 1) return response(roomId);
  }

  return { ok: false as const, error: "La room a changé, réessaie." };
}
