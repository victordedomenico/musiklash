"use server";

import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import type { BlindtestParticipant } from "@/lib/blindtest-room";

function modelHasField(modelName: string, fieldName: string): boolean {
  const runtime = (
    prisma as unknown as {
      _runtimeDataModel?: {
        models?: Record<string, { fields?: Array<{ name: string }> }>;
      };
    }
  )._runtimeDataModel;
  const model = runtime?.models?.[modelName];
  if (!model?.fields) return false;
  return model.fields.some((f) => f.name === fieldName);
}

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

  const hasRoomVisibility = modelHasField("BlindtestRoom", "visibility");
  const hasRoomParticipants = modelHasField("BlindtestRoom", "participants");

  if (!hasRoomParticipants) {
    redirect(`/blindtest/${blindtestId}?multi=unavailable`);
  }

  const data: Record<string, unknown> = {
    blindtestId,
    hostId: user.id,
    status: "waiting",
    participants: [hostParticipant] as unknown as Prisma.JsonArray,
  };
  if (hasRoomVisibility) {
    data.visibility = visibility;
  }

  const room = await prisma.blindtestRoom.create({
    data: data as Prisma.BlindtestRoomUncheckedCreateInput,
  });

  redirect(`/blindtest/room/${room.id}`);
}
