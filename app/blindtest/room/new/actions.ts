"use server";

import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import type { BlindtestParticipant } from "@/lib/blindtest-room";

export async function createBlindtestRoom(
  blindtestId: string,
  visibility: "private" | "public" = "private",
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const bt = await prisma.blindtest.findUnique({ where: { id: blindtestId } });
  if (!bt) redirect(`/blindtest/${blindtestId}`);

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
      visibility,
      status: "waiting",
      participants: [hostParticipant] as unknown as Prisma.JsonArray,
    },
  });

  redirect(`/blindtest/room/${room.id}`);
}
