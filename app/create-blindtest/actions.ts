"use server";

import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { resolvePlayerIdentity } from "@/lib/guest";

export type BlindtestTrackInput = {
  deezer_track_id: number;
  title: string;
  artist: string;
  preview_url: string;
  cover_url: string | null;
};

export async function createBlindtest(input: {
  title: string;
  visibility: "private" | "public";
  tracks: BlindtestTrackInput[];
}) {
  if (!input.title.trim()) return { error: "Le titre est requis." };
  if (input.tracks.length < 3) return { error: "Il faut au moins 3 morceaux." };
  if (input.tracks.length > 50) return { error: "50 morceaux maximum." };

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

  let blindtestId: string;
  try {
    const bt = await prisma.blindtest.create({
      data: {
        ownerId: identity.playerId,
        title: input.title.trim(),
        visibility: input.visibility,
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
    blindtestId = bt.id;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur création blindtest.";
    return { error: msg };
  }

  redirect(`/blindtest/${blindtestId}`);
}
