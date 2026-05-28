"use server";

import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import type { StreamClashParticipant } from "@/lib/stream-clash-room";
import type { StreamClashDifficulty } from "@/lib/stream-clash";

export async function createStreamClashRoom(input: {
  streamClashId: string;
  difficulty: StreamClashDifficulty;
  totalRounds: number;
  visibility: "private" | "public";
}) {
  const streamClashModel = (
    prisma as unknown as {
      streamClash?: {
        findUnique: typeof prisma.streamClash.findUnique;
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

  if (!streamClashModel?.findUnique || !streamClashRoomModel?.create) {
    redirect("/create-stream-clash?error=prisma-not-updated");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const sc = await streamClashModel.findUnique({ where: { id: input.streamClashId } });
  if (!sc) redirect("/create-stream-clash");

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

  const room = await streamClashRoomModel.create({
    data: {
      streamClashId: input.streamClashId,
      hostId: user.id,
      status: "waiting",
      visibility: input.visibility,
      difficulty: input.difficulty,
      totalRounds: input.totalRounds,
      participants: [hostParticipant] as unknown as Prisma.JsonArray,
    },
  });

  redirect(`/stream-clash/room/${room.id}`);
}
