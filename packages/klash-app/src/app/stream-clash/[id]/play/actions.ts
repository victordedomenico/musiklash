"use server";

import prisma from "@klash/klash-app/lib/prisma";
import { resolvePlayerIdentity } from "@klash/klash-app/lib/guest";
import {
  checkAnswer,
  POINTS_PER_CORRECT,
  type StreamClashDifficulty,
  type StreamClashPair,
  type StreamClashRound,
} from "@klash/klash-app/lib/stream-clash";
import type { Prisma } from "@prisma/client";

async function requirePlayer() {
  try {
    const identity = await resolvePlayerIdentity();
    return { id: identity.playerId };
  } catch {
    return null;
  }
}

export async function createSession(
  streamClashId: string,
  difficulty: StreamClashDifficulty,
  totalRounds: number,
  visibility: "private" | "public",
): Promise<{ ok: true; sessionId: string } | { ok: false; error: string }> {
  const user = await requirePlayer();

  try {
    const session = await prisma.streamClashSession.create({
      data: {
        streamClashId,
        playerId: user?.id ?? null,
        difficulty,
        totalRounds,
        score: 0,
        rounds: [] as unknown as Prisma.JsonArray,
        visibility,
      },
    });
    return { ok: true, sessionId: session.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur création session.";
    return { ok: false, error: msg };
  }
}

export async function submitRound(
  sessionId: string,
  pair: StreamClashPair,
  chosenPosition: number,
): Promise<{ ok: true; correct: boolean; score: number } | { ok: false; error: string }> {
  const session = await prisma.streamClashSession.findUnique({ where: { id: sessionId } });
  if (!session) return { ok: false, error: "Session introuvable." };

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

  const existingRounds = Array.isArray(session.rounds) ? (session.rounds as StreamClashRound[]) : [];
  const updatedRounds = [...existingRounds, round];
  const newScore = session.score + points;

  await prisma.streamClashSession.update({
    where: { id: sessionId },
    data: {
      score: newScore,
      rounds: updatedRounds as unknown as Prisma.JsonArray,
    },
  });

  return { ok: true, correct, score: newScore };
}

export async function finishSession(
  sessionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const session = await prisma.streamClashSession.findUnique({
      where: { id: sessionId },
      select: { rounds: true },
    });
    if (!session) return { ok: true };

    const roundCount = Array.isArray(session.rounds) ? session.rounds.length : 0;
    await prisma.streamClashSession.update({
      where: { id: sessionId },
      data: { totalRounds: roundCount },
    });
    return { ok: true };
  } catch {
    return { ok: true }; // non-blocking
  }
}
