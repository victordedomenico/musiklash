"use server";

import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { resolvePlayerIdentity } from "@/lib/guest";
import { createClient } from "@/lib/supabase/server";
import type { StreamClashParticipant } from "@/lib/stream-clash-room";

export type StreamClashTrackInput = {
  deezer_track_id: number;
  title: string;
  artist: string;
  preview_url: string;
  cover_url: string | null;
  rank: number;
};

export async function createStreamClash(input: {
  title: string;
  visibility: "private" | "public" | "none";
  tracks: StreamClashTrackInput[];
  mode: "solo" | "multi";
  difficulty?: "easy" | "normal" | "hard";
  totalRounds?: number;
}) {
  const streamClashModel = (
    prisma as unknown as {
      streamClash?: {
        create: typeof prisma.streamClash.create;
      };
      streamClashRoom?: {
        create: typeof prisma.streamClashRoom.create;
      };
    }
  ).streamClash;

  const streamClashRoomModel = (
    prisma as unknown as {
      streamClashRoom?: {
        create: typeof prisma.streamClashRoom.create;
      };
    }
  ).streamClashRoom;

  if (!streamClashModel?.create) {
    return {
      error:
        "Le client Prisma n'est pas à jour pour Stream Clash. Redémarre le serveur (`npm run dev`) pour recharger les nouveaux modèles.",
    };
  }

  if (!input.title.trim()) return { error: "Le titre est requis." };
  if (input.tracks.length < 4) return { error: "Il faut au moins 4 morceaux." };
  if (input.tracks.length > 50) return { error: "50 morceaux maximum." };

  if (input.mode === "multi" && input.visibility === "none") {
    return {
      error: "Le mode multijoueur nécessite un Stream Clash conservé (privé ou public).",
    };
  }

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

  const transient = input.visibility === "none";
  const storedVisibility = transient ? "private" : input.visibility;

  let streamClashId: string;
  try {
    const sc = await streamClashModel.create({
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
            rank: t.rank,
          })),
        },
      },
    });
    streamClashId = sc.id;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur lors de la création.";
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
        const hostParticipant: StreamClashParticipant = {
          playerId: user.id,
          username: profile?.username ?? "Joueur",
          score: 0,
          rounds: [],
          lastSeenAt: nowIso,
          joinedAt: nowIso,
        };
        if (!streamClashRoomModel?.create) {
          return {
            error:
              "Le client Prisma n'est pas à jour pour les rooms Stream Clash. Redémarre le serveur (`npm run dev`).",
          };
        }

        const room = await streamClashRoomModel.create({
          data: {
            streamClashId,
            hostId: user.id,
            visibility: storedVisibility,
            status: "waiting",
            difficulty: input.difficulty ?? "easy",
            totalRounds: input.totalRounds ?? 10,
            participants: [hostParticipant] as unknown as Prisma.JsonArray,
          },
        });
        roomId = room.id;
      } catch {
        // fall through to content page
      }
      if (roomId) redirect(`/stream-clash/room/${roomId}`);
    }
    redirect(`/stream-clash/${streamClashId}`);
  }

  redirect(`/stream-clash/${streamClashId}/play${transient ? "?transient=1" : ""}`);
}
