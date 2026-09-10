"use server";

import { redirect } from "next/navigation";
import { MAX_BRACKET_TRACKS, shuffle } from "@/lib/bracket";
import { ensureGenreColumns } from "@/lib/ensure-genre-columns";
import { sanitizeGenre } from "@/lib/genres";
import { resolvePlayerIdentity } from "@/lib/guest";

export type SelectedTrack = {
  deezer_track_id: number;
  title: string;
  artist: string;
  preview_url: string;
  cover_url: string | null;
  rank?: number;
};

export async function createBracket(input: {
  title: string;
  theme: string;
  genre?: string | null;
  visibility: "private" | "public" | "none";
  tracks: SelectedTrack[];
}) {
  if (input.tracks.length < 3) {
    return { error: "Il faut au moins 3 morceaux." };
  }
  if (input.tracks.length > MAX_BRACKET_TRACKS) {
    return { error: `Un tournoi peut contenir jusqu’à ${MAX_BRACKET_TRACKS} morceaux.` };
  }
  if (!input.title.trim()) {
    return { error: "Le titre est requis." };
  }

  // Randomize the draw once. Stored seeds preserve it across resumed sessions;
  // a dynamic round grants one bye whenever its participant count is odd.
  const drawnTracks = shuffle(input.tracks);

  const prisma = (await import("@/lib/prisma")).default;
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

  let bracketId: string;
  const transient = input.visibility === "none";
  const storedVisibility = transient ? "private" : input.visibility;

  try {
    await ensureGenreColumns(prisma);
    const bracket = await prisma.bracket.create({
      data: {
        ownerId: identity.playerId,
        title: input.title.trim(),
        theme: input.theme.trim() || null,
        genre: sanitizeGenre(input.genre),
        size: drawnTracks.length,
        drawVersion: 2,
        visibility: storedVisibility,
        coverUrl: input.tracks[0]?.cover_url ?? null,
        tracks: {
          create: drawnTracks.map((t, i) => ({
            seed: i + 1,
            deezerTrackId: BigInt(t.deezer_track_id),
            title: t.title,
            artist: t.artist,
            previewUrl: "",
            coverUrl: t.cover_url,
          })),
        },
      },
    });

    bracketId = bracket.id;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur à la création du bracket.";
    return { error: msg };
  }

  redirect(`/bracket-game/${bracketId}${transient ? "?transient=1" : ""}`);
}
