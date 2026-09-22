"use server";

import { redirect } from "next/navigation";
import { MAX_BRACKET_TRACKS, shuffle } from "@/lib/bracket";
import { ensureGenreColumns } from "@/lib/ensure-genre-columns";
import { sanitizeGenre } from "@/lib/genres";
import { resolvePlayerIdentity } from "@/lib/guest";
import type { Prisma } from "@prisma/client";

export type SelectedTrack = {
  deezer_track_id: number;
  title: string;
  artist: string;
  album?: string | null;
  preview_url: string;
  cover_url: string | null;
  rank?: number;
};

export async function createBracket(input: {
  title: string;
  theme: string;
  genre?: string | null;
  visibility: "private" | "public" | "none";
  mode?: "solo" | "multi";
  timerEnabled?: boolean;
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

  let bracketId: string;
  let roomId: string | null = null;
  const isCollaborative = input.mode === "multi";
  const timerEnabled = isCollaborative && input.timerEnabled === true;
  const transient = input.visibility === "none" && !isCollaborative;
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
            album: t.album ?? null,
            previewUrl: "",
            coverUrl: t.cover_url,
          })),
        },
      },
    });

    bracketId = bracket.id;
    if (isCollaborative) {
      const room = await prisma.bracketRoom.create({
        data: {
          bracketId,
          hostId: identity.playerId,
          hostLastSeenAt: new Date(),
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
    const msg = err instanceof Error ? err.message : "Erreur à la création du bracket.";
    return { error: msg };
  }

  if (roomId) redirect(`/bracket-game/room/${roomId}`);
  redirect(`/bracket-game/${bracketId}${transient ? "?transient=1" : ""}`);
}
