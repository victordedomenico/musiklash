"use server";

import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { resolvePlayerIdentity } from "@/lib/guest";

export type CreateBattleFeatChallengeInput = {
  title: string;
  difficulty: number;
  visibility: "private" | "public";
  startingArtistId: string;
  startingArtistName: string;
  startingArtistPic: string | null;
};

export async function createBattleFeatChallenge(input: CreateBattleFeatChallengeInput) {
  const title = input.title.trim();
  if (!title) return { error: "Le titre est requis." };
  if (title.length > 120) return { error: "Titre trop long (120 caractères max)." };
  if (![1, 2, 3].includes(input.difficulty)) {
    return { error: "Difficulté invalide." };
  }
  if (input.visibility !== "private" && input.visibility !== "public") {
    return { error: "Visibilité invalide." };
  }
  if (!input.startingArtistId || !input.startingArtistName) {
    return { error: "L'artiste de départ est requis." };
  }

  let identity: { playerId: string };
  try {
    identity = await resolvePlayerIdentity();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Connexion requise.";
    return { error: msg };
  }

  try {
    const challenge = await prisma.battleFeatSoloChallenge.create({
      data: {
        ownerId: identity.playerId,
        title,
        difficulty: input.difficulty,
        startingArtistId: String(input.startingArtistId),
        startingArtistName: input.startingArtistName,
        startingArtistPic: input.startingArtistPic,
        visibility: input.visibility,
      },
    });
    redirect(`/battle-feat/${challenge.id}`);
  } catch (err: unknown) {
    // redirect throws internally — rethrow it so Next can handle it.
    if (err && typeof err === "object" && "digest" in err) {
      throw err;
    }
    const msg = err instanceof Error ? err.message : "Erreur création BattleFeat solo.";
    return { error: msg };
  }
}
