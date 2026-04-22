"use server";

import prisma from "@/lib/prisma";
import type { FeatMove } from "@/lib/battle-feat";
import { resolvePlayerIdentity } from "@/lib/guest";

export async function saveSoloSession(
  difficulty: number,
  startingArtistId: string,
  moves: FeatMove[],
  score: number,
  jokersUsed: number,
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
    const session = await prisma.battleFeatSoloSession.create({
      data: {
        playerId: identity.playerId,
        difficulty,
        startingArtistId: String(startingArtistId),
        moves: moves as unknown as import("@prisma/client").Prisma.JsonArray,
        score,
        jokersUsed,
        status: "finished",
        visibility,
      },
    });
    return { id: session.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur sauvegarde.";
    console.error("[saveSoloSession]", msg);
    return { error: msg };
  }
}
