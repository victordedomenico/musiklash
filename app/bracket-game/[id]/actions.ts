"use server";

import prisma from "@/lib/prisma";
import { resolvePlayerIdentity } from "@/lib/guest";
import type { Vote } from "@/lib/bracket";

export async function saveBracketGame(
  bracketId: string,
  votes: Vote[],
  winnerSeed: number,
  visibility: "private" | "public" = "private",
): Promise<{ id: string } | { error: string }> {
  let identity: { playerId: string } | null = null;
  try {
    identity = await resolvePlayerIdentity();
  } catch {
    // Guest path may be unavailable briefly; fall back to anonymous save.
    identity = null;
  }

  try {
    const game = await prisma.bracketGame.create({
      data: {
        bracketId,
        playerId: identity?.playerId ?? null,
        currentRound: Math.max(1, ...votes.map((v) => v.round)),
        winnerSeed,
        visibility,
        votes: {
          createMany: {
            data: votes.map((v) => ({
              round: v.round,
              matchIndex: v.matchIndex,
              winnerSeed: v.winnerSeed,
            })),
          },
        },
      },
      select: { id: true },
    });
    return { id: game.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur sauvegarde.";
    return { error: msg };
  }
}

export async function deleteTransientBracket(bracketId: string) {
  let identity: { playerId: string };
  try {
    identity = await resolvePlayerIdentity();
  } catch {
    return { error: "Connexion requise." };
  }

  const res = await prisma.bracket.deleteMany({
    where: { id: bracketId, ownerId: identity.playerId },
  });
  if (res.count === 0) {
    return { error: "Bracket introuvable ou accès refusé." };
  }
  return { ok: true as const };
}
