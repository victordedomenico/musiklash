"use server";

import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import type { BattleFeatParticipant } from "@/lib/battle-feat";

export async function createRoom(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const rawVisibility = String(formData.get("visibility") ?? "private");
  const visibility = rawVisibility === "public" ? "public" : "private";

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { username: true },
  });
  const nowIso = new Date().toISOString();
  const hostParticipant: BattleFeatParticipant = {
    playerId: user.id,
    username: profile?.username ?? "Joueur",
    score: 0,
    jokers: 1,
    eliminated: false,
    position: 0,
    lastSeenAt: nowIso,
    joinedAt: nowIso,
  };

  const room = await prisma.battleFeatRoom.create({
    data: {
      hostId: user.id,
      visibility,
      status: "waiting",
      usedArtistIds: [],
      moves: [],
      participants: [hostParticipant] as unknown as Prisma.JsonArray,
    },
  });

  redirect(`/battle-feat/room/${room.id}`);
}
