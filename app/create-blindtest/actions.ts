"use server";

import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { resolvePlayerIdentity } from "@/lib/guest";
import { createClient } from "@/lib/supabase/server";

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
  mode: "solo" | "multi";
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

  if (input.mode === "multi") {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      try {
        const room = await prisma.blindtestRoom.create({
          data: {
            blindtestId,
            hostId: user.id,
            status: "waiting",
            hostAnswers: [],
            guestAnswers: [],
          },
        });
        redirect(`/blindtest/room/${room.id}`);
      } catch {
        // If room creation fails, fall through to blindtest detail page
      }
    }
    // Not logged in or room creation failed: go to blindtest page so user can create room after login
    redirect(`/blindtest/${blindtestId}`);
  }

  redirect(`/blindtest/${blindtestId}/play`);
}
