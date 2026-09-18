"use server";

import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { resolvePlayerIdentity } from "@/lib/guest";
import { buildBracketState, type Pairing } from "@/lib/bracket";
import { BRACKET_DUEL_SECONDS, resolveBracketBallots } from "@/lib/bracket-room-rules";
import {
  getBracketRoomSnapshot,
  normalizeBracketBallots,
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

export async function refreshBracketRoom(roomId: string) {
  return response(roomId);
}

export async function joinBracketRoom(roomId: string) {
  const user = await identity();
  if (!user) return { ok: false as const, error: "Connexion requise." };
  const room = await prisma.bracketRoom.findUnique({ where: { id: roomId } });
  if (!room) return { ok: false as const, error: "Room introuvable." };
  if (room.status !== "waiting") return { ok: false as const, error: "La partie a déjà commencé." };
  const participants = normalizeParticipants(room.participants);
  if (!participants.some((participant) => participant.playerId === user.playerId)) {
    await prisma.bracketRoom.update({
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
      duelStartedAt: new Date(),
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

function hasExpired(room: DuelRoom) {
  const startedAt = room.duelStartedAt ?? (room.status === "playing" ? room.updatedAt : null);
  return Boolean(startedAt && Date.now() >= startedAt.getTime() + BRACKET_DUEL_SECONDS * 1000);
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
    duelStartedAt: state.winner ? null : new Date(),
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
    if (ballots.some((ballot) => ballot.playerId === user.playerId)) {
      return { ok: false as const, error: "Tu as déjà répondu pour ce duel." };
    }

    const shouldResolveExpired = hasExpired(room);
    const nextBallots = shouldResolveExpired
      ? ballots
      : [...ballots, { playerId: user.playerId, winnerSeed }];
    const shouldResolve = shouldResolveExpired || nextBallots.length >= participants.length;
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

export async function expireBracketDuel(roomId: string) {
  const user = await identity();
  if (!user) return { ok: false as const, error: "Connexion requise." };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const room = await findRoomForDuel(roomId);
    if (!room) return { ok: false as const, error: "Room introuvable." };
    if (room.status !== "playing") return response(roomId);

    const participants = normalizeParticipants(room.participants);
    if (!participants.some((participant) => participant.playerId === user.playerId)) {
      return { ok: false as const, error: "Rejoins la room avant de continuer." };
    }
    if (!hasExpired(room)) {
      return { ok: false as const, error: "Le temps de vote n’est pas encore écoulé." };
    }

    const { votes, round, pair } = getOpenDuel(room);
    if (!pair) return response(roomId);
    const updated = await prisma.bracketRoom.updateMany({
      where: { id: roomId, revision: room.revision, status: "playing" },
      data: resolvedDuelData(room, normalizeBracketBallots(room.ballots), pair, round, votes),
    });
    if (updated.count === 1) return response(roomId);
  }

  return response(roomId);
}
