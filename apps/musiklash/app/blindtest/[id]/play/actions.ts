"use server";

import prisma from "@/lib/prisma";
import type { BlindtestAnswer } from "@/components/BlindtestGame";
import { resolvePlayerIdentity } from "@/lib/guest";

export async function saveBlindtestSession(
  blindtestId: string,
  answers: BlindtestAnswer[],
  score: number,
  maxScore: number,
  visibility: "private" | "public" = "private",
) {
  let identity: { playerId: string };
  try {
    identity = await resolvePlayerIdentity();
  } catch (err: unknown) {
    const msg =
      err instanceof Error
        ? err.message
        : "Impossible de créer une session invitée pour le moment.";
    return { error: msg };
  }

  try {
    const session = await prisma.blindtestSession.create({
      data: {
        blindtestId,
        playerId: identity.playerId,
        score,
        maxScore,
        answers: answers as unknown as import("@prisma/client").Prisma.JsonArray,
        visibility,
      },
    });
    return { id: session.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur sauvegarde.";
    return { error: msg };
  }
}

export async function deleteTransientBlindtest(blindtestId: string) {
  let identity: { playerId: string };
  try {
    identity = await resolvePlayerIdentity();
  } catch {
    return { error: "Connexion requise." };
  }

  const res = await prisma.blindtest.deleteMany({
    where: { id: blindtestId, ownerId: identity.playerId },
  });
  if (res.count === 0) {
    return { error: "Blindtest introuvable ou accès refusé." };
  }
  return { ok: true as const };
}
