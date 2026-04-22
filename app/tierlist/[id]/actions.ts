"use server";

import prisma from "@/lib/prisma";
import { resolvePlayerIdentity } from "@/lib/guest";
import { type TierlistSavePayload } from "@/lib/tierlist-tiers";

export async function saveTierlistSession(
  tierlistId: string,
  payload: TierlistSavePayload,
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
    const session = await prisma.tierlistSession.create({
      data: {
        tierlistId,
        playerId: identity.playerId,
        placements: payload,
        visibility,
      },
    });
    return { id: session.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur sauvegarde.";
    return { error: msg };
  }
}

export async function deleteTransientTierlist(tierlistId: string) {
  let identity: { playerId: string };
  try {
    identity = await resolvePlayerIdentity();
  } catch {
    return { error: "Connexion requise." };
  }

  const res = await prisma.tierlist.deleteMany({
    where: { id: tierlistId, ownerId: identity.playerId },
  });
  if (res.count === 0) {
    return { error: "Tierlist introuvable ou accès refusé." };
  }
  return { ok: true as const };
}
