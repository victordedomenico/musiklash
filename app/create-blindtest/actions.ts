"use server";

import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { resolvePlayerIdentity } from "@/lib/guest";
import { createClient } from "@/lib/supabase/server";
import type { BlindtestParticipant } from "@/lib/blindtest-room";

export type BlindtestTrackInput = {
  deezer_track_id: number;
  title: string;
  artist: string;
  preview_url: string;
  cover_url: string | null;
};

export async function createBlindtest(input: {
  title: string;
  visibility: "private" | "public" | "none";
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

  if (input.mode === "multi" && input.visibility === "none") {
    return { error: "Le mode multijoueur nécessite un blindtest conservé (non publié ou publié)." };
  }

  const transient = input.visibility === "none";
  const storedVisibility = transient ? "private" : input.visibility;

  let blindtestId: string;
  try {
    const bt = await prisma.blindtest.create({
      data: {
        ownerId: identity.playerId,
        title: input.title.trim(),
        visibility: storedVisibility,
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
      let roomId: string | null = null;
      try {
        const profile = await prisma.profile.findUnique({
          where: { id: user.id },
          select: { username: true },
        });
        const nowIso = new Date().toISOString();
        const hostParticipant: BlindtestParticipant = {
          playerId: user.id,
          username: profile?.username ?? "Joueur",
          score: 0,
          answers: [],
          lastSeenAt: nowIso,
          joinedAt: nowIso,
        };
        const room = await prisma.blindtestRoom.create({
          data: {
            blindtestId,
            hostId: user.id,
            visibility: storedVisibility,
            status: "waiting",
            participants: [hostParticipant] as unknown as Prisma.JsonArray,
          },
        });
        roomId = room.id;
      } catch {
        // room creation failed, fall through
      }
      if (roomId) redirect(`/blindtest/room/${roomId}`);
    }
    // Not logged in or room creation failed
    redirect(`/blindtest/${blindtestId}`);
  }

  redirect(`/blindtest/${blindtestId}/play${transient ? "?transient=1" : ""}`);
}
