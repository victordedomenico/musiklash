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

export async function updateTierlistTracks(
  tierlistId: string,
  originalPositions: number[],
  input: { deezer_track_id: number; title: string; artist: string; cover_url: string | null }[],
) {
  const { z } = await import("zod");
  const { MAX_BRACKET_TRACKS } = await import("@/lib/bracket");
  const schema = z
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
  const parsed = schema.safeParse(input);
  if (
    !parsed.success ||
    !Array.isArray(originalPositions) ||
    !originalPositions.every(Number.isInteger) ||
    new Set(parsed.success ? parsed.data.map((track) => track.deezer_track_id) : []).size !==
      input.length
  ) {
    return { error: "Sélection de morceaux invalide." };
  }
  let identity: { playerId: string };
  try {
    identity = await resolvePlayerIdentity();
  } catch {
    return { error: "Connexion requise." };
  }
  try {
    return await prisma.$transaction(
      async (tx) => {
        const tierlist = await tx.tierlist.findFirst({
          where: { id: tierlistId, ownerId: identity.playerId },
          include: {
            tracks: { orderBy: { position: "asc" } },
            _count: { select: { rooms: true } },
          },
        });
        if (!tierlist) return { error: "Tierlist introuvable ou accès refusé." };
        if (tierlist._count.rooms)
          return { error: "Les tierlists collaboratives ne peuvent pas encore être modifiées." };
        const active = tierlist.tracks.filter((track) => !track.archived);
        if (active.map((track) => track.position).join(",") !== originalPositions.join(",")) {
          return { error: "La sélection a changé. Recharge la page avant de réessayer." };
        }
        const selected = new Set(parsed.data.map((track) => track.deezer_track_id));
        const removed = active.filter((track) => !selected.has(Number(track.deezerTrackId)));
        const existing = new Set(active.map((track) => Number(track.deezerTrackId)));
        const added = parsed.data.filter((track) => !existing.has(track.deezer_track_id));
        let position = tierlist.tracks.reduce((max, track) => Math.max(max, track.position), -1);
        if (position + added.length > 32767)
          return { error: "Cette tierlist ne peut plus recevoir de morceaux." };
        if (removed.length)
          await tx.tierlistTrack.updateMany({
            where: { tierlistId, position: { in: removed.map((track) => track.position) } },
            data: { archived: true },
          });
        if (added.length)
          await tx.tierlistTrack.createMany({
            data: added.map((track) => ({
              tierlistId,
              position: ++position,
              deezerTrackId: BigInt(track.deezer_track_id),
              title: track.title,
              artist: track.artist,
              coverUrl: track.cover_url,
              previewUrl: "",
            })),
          });
        return { ok: true as const };
      },
      { isolationLevel: "Serializable" },
    );
  } catch {
    return { error: "Impossible de modifier la tierlist. Recharge la page et réessaie." };
  }
}
