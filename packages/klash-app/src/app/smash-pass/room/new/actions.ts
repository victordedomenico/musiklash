"use server";

import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import prisma from "@klash/klash-app/lib/prisma";
import { createClient } from "@klash/klash-app/lib/supabase/server";
import type { SmashPassParticipant } from "@klash/klash-app/lib/smash-pass";

export async function createSmashPassRoom(smashPassId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Connecte-toi pour créer une room multijoueur." };
  }

  const smashPass = await prisma.smashPass.findUnique({
    where: { id: smashPassId },
    select: { id: true, ownerId: true },
  });
  if (!smashPass) return { error: "Deck introuvable." };

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { username: true },
  });

  const nowIso = new Date().toISOString();
  const hostParticipant: SmashPassParticipant = {
    playerId: user.id,
    username: profile?.username ?? "Joueur",
    smashCount: 0,
    passCount: 0,
    choices: {},
    lastSeenAt: nowIso,
    joinedAt: nowIso,
  };

  const room = await prisma.smashPassRoom.create({
    data: {
      smashPassId,
      hostId: user.id,
      visibility: "private",
      status: "waiting",
      participants: [hostParticipant] as unknown as Prisma.JsonArray,
    },
  });

  redirect(`/smash-pass/room/${room.id}`);
}
