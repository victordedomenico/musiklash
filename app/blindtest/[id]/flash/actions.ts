"use server";

import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { resolvePlayerIdentity } from "@/lib/guest";
import {
  FLASH_TRACKS_PER_SESSION,
  flashAnswerPoints,
  flashDifficultyAt,
  isFlashDifficulty,
  isFlashListenSeconds,
  type FlashAnswer,
} from "@/lib/blindtest-flash";

export async function saveFlashBlindtestSession(input: {
  blindtestId: string;
  difficulty: string;
  listenSeconds: number;
  trackCount: number;
  score: number;
  answers: FlashAnswer[];
}) {
  if (!isFlashDifficulty(input.difficulty) || !isFlashListenSeconds(input.listenSeconds)) {
    return { error: "Réglages du Blindtest éclair invalides." };
  }
  if (
    !Number.isInteger(input.trackCount) ||
    input.trackCount < 1 ||
    input.trackCount > FLASH_TRACKS_PER_SESSION
  ) {
    return { error: "Nombre de morceaux invalide." };
  }
  if (
    !Number.isInteger(input.score) ||
    input.score < 0 ||
    !Array.isArray(input.answers) ||
    input.answers.length !== input.trackCount ||
    input.answers.some((answer) => !answer || typeof answer !== "object")
  ) {
    return { error: "Résultat du Blindtest éclair invalide." };
  }

  const blindtest = await prisma.blindtest.findUnique({
    where: { id: input.blindtestId },
    select: { mode: true, tracks: { select: { position: true } } },
  });
  if (!blindtest || blindtest.mode !== "flash" || input.trackCount > blindtest.tracks.length) {
    return { error: "Ce Blindtest éclair n'est plus disponible." };
  }

  const validPositions = new Set(blindtest.tracks.map((track) => track.position));
  const answeredPositions = new Set(input.answers.map((answer) => answer.position));
  const answersAreValid =
    answeredPositions.size === input.trackCount &&
    input.answers.every((answer, index) => {
      const difficulty = answer.difficulty ?? flashDifficultyAt(index);
      const listenSeconds = answer.listenSeconds ?? input.listenSeconds;
      return (
        Number.isInteger(answer.position) &&
        validPositions.has(answer.position) &&
        typeof answer.correct === "boolean" &&
        typeof answer.skipped === "boolean" &&
        !(answer.correct && answer.skipped) &&
        isFlashDifficulty(difficulty) &&
        difficulty === flashDifficultyAt(index) &&
        isFlashListenSeconds(listenSeconds) &&
        answer.points === flashAnswerPoints(answer, difficulty, listenSeconds)
      );
    });
  const expectedScore = input.answers.reduce((total, answer) => total + answer.points, 0);
  if (!answersAreValid || input.score !== expectedScore) {
    return { error: "Résultat du Blindtest éclair invalide." };
  }

  let playerId: string | null = null;
  try {
    playerId = (await resolvePlayerIdentity()).playerId;
  } catch {
    // Un résultat local reste disponible, même si l'identité invitée ne peut être créée.
  }

  await prisma.blindtestFlashSession.create({
    data: {
      blindtestId: input.blindtestId,
      playerId,
      difficulty: input.difficulty,
      listenSeconds: input.listenSeconds,
      trackCount: input.trackCount,
      score: input.score,
      answers: input.answers as unknown as Prisma.InputJsonValue,
    },
  });

  return { ok: true };
}
