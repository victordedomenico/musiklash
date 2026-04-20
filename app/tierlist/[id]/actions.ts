"use server";

import prisma from "@/lib/prisma";
import { resolvePlayerIdentity } from "@/lib/guest";
import { type TierlistSavePayload } from "@/lib/tierlist-tiers";

export async function saveTierlistSession(
  tierlistId: string,
  payload: TierlistSavePayload,
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
    const session = await prisma.tierlistSession.create({
      data: {
        tierlistId,
        playerId: identity.playerId,
        placements: payload,
      },
    });
    return { id: session.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur sauvegarde.";
    return { error: msg };
  }
}
