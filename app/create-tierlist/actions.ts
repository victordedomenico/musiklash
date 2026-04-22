"use server";

import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { resolvePlayerIdentity } from "@/lib/guest";

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
  visibility: "private" | "public" | "none";
  tracks: TierlistTrackInput[];
}) {
  if (!input.title.trim()) return { error: "Le titre est requis." };
  if (input.tracks.length < 2)
    return { error: "Il faut au moins 2 morceaux." };
  if (input.tracks.length > 50)
    return { error: "50 morceaux maximum." };

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

  let tierlistId: string;
  const transient = input.visibility === "none";
  const storedVisibility = transient ? "private" : input.visibility;
  try {
    const tl = await prisma.tierlist.create({
      data: {
        ownerId: identity.playerId,
        title: input.title.trim(),
        theme: input.theme.trim() || null,
        visibility: storedVisibility,
        coverUrl: input.tracks[0]?.cover_url ?? null,
        tracks: {
          create: input.tracks.map((t, i) => ({
            position: i,
            deezerTrackId: BigInt(t.deezer_track_id),
            title: t.title,
            artist: t.artist,
            previewUrl: t.preview_url,
            coverUrl: t.cover_url,
          })),
        },
      },
    });
    tierlistId = tl.id;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur création tierlist.";
    return { error: msg };
  }

  redirect(`/tierlist/${tierlistId}${transient ? "?transient=1" : ""}`);
}
