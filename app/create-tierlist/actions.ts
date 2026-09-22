"use server";

import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { ensureGenreColumns } from "@/lib/ensure-genre-columns";
import { sanitizeGenre } from "@/lib/genres";
import { resolvePlayerIdentity } from "@/lib/guest";
import type { Prisma } from "@prisma/client";

export type TierlistTrackInput = {
  deezer_track_id: number;
  title: string;
  artist: string;
  preview_url: string;
  cover_url: string | null;
};

export async function createTierlist(input: {
  title: string;
  theme: string;
  genre?: string | null;
  visibility: "private" | "public" | "none";
  mode?: "solo" | "multi";
  timerEnabled?: boolean;
  tracks: TierlistTrackInput[];
}) {
  if (!input.title.trim()) return { error: "Le titre est requis." };
  if (input.tracks.length < 2) return { error: "Il faut au moins 2 morceaux." };
  if (input.tracks.length > 50) return { error: "50 morceaux maximum." };

  let identity: { playerId: string; username: string };
  try {
    identity = await resolvePlayerIdentity();
  } catch (err: unknown) {
    const msg =
      err instanceof Error
        ? err.message
        : "Impossible de créer une session invitée pour le moment.";
    return { error: msg };
  }

  let tierlistId: string;
  let roomId: string | null = null;
  const isCollaborative = input.mode === "multi";
  const timerEnabled = isCollaborative && input.timerEnabled === true;
  const transient = input.visibility === "none" && !isCollaborative;
  const storedVisibility = transient ? "private" : input.visibility;
  try {
    await ensureGenreColumns(prisma);
    const tl = await prisma.tierlist.create({
      data: {
        ownerId: identity.playerId,
        title: input.title.trim(),
        theme: input.theme.trim() || null,
        genre: sanitizeGenre(input.genre),
        visibility: storedVisibility,
        coverUrl: input.tracks[0]?.cover_url ?? null,
        tracks: {
          create: input.tracks.map((t, i) => ({
            position: i,
            deezerTrackId: BigInt(t.deezer_track_id),
            title: t.title,
            artist: t.artist,
            previewUrl: "",
            coverUrl: t.cover_url,
          })),
        },
      },
    });
    tierlistId = tl.id;
    if (isCollaborative) {
      const room = await prisma.tierlistRoom.create({
        data: {
          tierlistId,
          hostId: identity.playerId,
          timerEnabled,
          participants: [
            { playerId: identity.playerId, username: identity.username },
          ] as unknown as Prisma.JsonArray,
        },
        select: { id: true },
      });
      roomId = room.id;
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur création tierlist.";
    return { error: msg };
  }

  if (roomId) redirect(`/tierlist/room/${roomId}`);
  redirect(`/tierlist/${tierlistId}${transient ? "?transient=1" : ""}`);
}
