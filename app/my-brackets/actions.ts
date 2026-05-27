"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { resolvePlayerIdentity } from "@/lib/guest";
import { ensureBattleFeatVisibilityColumns } from "@/lib/ensure-battle-feat-visibility-columns";

export type Visibility = "private" | "public";

async function requireIdentity() {
  try {
    return await resolvePlayerIdentity();
  } catch {
    return null;
  }
}

export async function updateBracketVisibility(id: string, visibility: Visibility) {
  const identity = await requireIdentity();
  if (!identity) return { error: "Connexion requise." };

  const res = await prisma.bracket.updateMany({
    where: { id, ownerId: identity.playerId },
    data: { visibility },
  });
  if (res.count === 0) return { error: "Bracket introuvable ou accès refusé." };
  revalidatePath("/my-brackets");
  revalidatePath("/explore");
  return { ok: true as const };
}

export async function updateTierlistVisibility(id: string, visibility: Visibility) {
  const identity = await requireIdentity();
  if (!identity) return { error: "Connexion requise." };

  const res = await prisma.tierlist.updateMany({
    where: { id, ownerId: identity.playerId },
    data: { visibility },
  });
  if (res.count === 0) return { error: "Tierlist introuvable ou accès refusé." };
  revalidatePath("/my-brackets");
  revalidatePath("/explore");
  return { ok: true as const };
}

export async function updateBlindtestVisibility(id: string, visibility: Visibility) {
  const identity = await requireIdentity();
  if (!identity) return { error: "Connexion requise." };

  const res = await prisma.blindtest.updateMany({
    where: { id, ownerId: identity.playerId },
    data: { visibility },
  });
  if (res.count === 0) return { error: "Blindtest introuvable ou accès refusé." };
  revalidatePath("/my-brackets");
  revalidatePath("/explore");
  return { ok: true as const };
}

export async function updateBattleFeatSoloVisibility(id: string, visibility: Visibility) {
  const identity = await requireIdentity();
  if (!identity) return { error: "Connexion requise." };

  await ensureBattleFeatVisibilityColumns(prisma);

  const res = await prisma.battleFeatSoloSession.updateMany({
    where: { id, playerId: identity.playerId },
    data: { visibility },
  });
  if (res.count === 0) return { error: "Session introuvable ou accès refusé." };
  revalidatePath("/my-brackets");
  revalidatePath("/explore");
  return { ok: true as const };
}

export async function updateBattleFeatRoomVisibility(id: string, visibility: Visibility) {
  const identity = await requireIdentity();
  if (!identity) return { error: "Connexion requise." };

  await ensureBattleFeatVisibilityColumns(prisma);

  const res = await prisma.battleFeatRoom.updateMany({
    where: { id, hostId: identity.playerId },
    data: { visibility },
  });
  if (res.count === 0) return { error: "Room introuvable ou accès refusé." };
  revalidatePath("/my-brackets");
  return { ok: true as const };
}

export async function deleteBracket(id: string) {
  const identity = await requireIdentity();
  if (!identity) return { error: "Connexion requise." };

  const res = await prisma.bracket.deleteMany({
    where: { id, ownerId: identity.playerId },
  });
  if (res.count === 0) return { error: "Bracket introuvable ou accès refusé." };
  revalidatePath("/my-brackets");
  revalidatePath("/explore");
  return { ok: true as const };
}

export async function deleteTierlist(id: string) {
  const identity = await requireIdentity();
  if (!identity) return { error: "Connexion requise." };

  const res = await prisma.tierlist.deleteMany({
    where: { id, ownerId: identity.playerId },
  });
  if (res.count === 0) return { error: "Tierlist introuvable ou accès refusé." };
  revalidatePath("/my-brackets");
  revalidatePath("/explore");
  return { ok: true as const };
}

export async function deleteBlindtest(id: string) {
  const identity = await requireIdentity();
  if (!identity) return { error: "Connexion requise." };

  const res = await prisma.blindtest.deleteMany({
    where: { id, ownerId: identity.playerId },
  });
  if (res.count === 0) return { error: "Blindtest introuvable ou accès refusé." };
  revalidatePath("/my-brackets");
  revalidatePath("/explore");
  return { ok: true as const };
}

export async function deleteBattleFeatSoloSession(id: string) {
  const identity = await requireIdentity();
  if (!identity) return { error: "Connexion requise." };

  const res = await prisma.battleFeatSoloSession.deleteMany({
    where: { id, playerId: identity.playerId },
  });
  if (res.count === 0) return { error: "Session introuvable ou accès refusé." };
  revalidatePath("/my-brackets");
  revalidatePath("/explore");
  return { ok: true as const };
}

export async function updateBracketGameVisibility(id: string, visibility: Visibility) {
  const identity = await requireIdentity();
  if (!identity) return { error: "Connexion requise." };

  const res = await prisma.bracketGame.updateMany({
    where: { id, playerId: identity.playerId },
    data: { visibility },
  });
  if (res.count === 0) return { error: "Partie introuvable ou accès refusé." };
  revalidatePath("/my-brackets");
  return { ok: true as const };
}

export async function updateTierlistSessionVisibility(id: string, visibility: Visibility) {
  const identity = await requireIdentity();
  if (!identity) return { error: "Connexion requise." };

  const res = await prisma.tierlistSession.updateMany({
    where: { id, playerId: identity.playerId },
    data: { visibility },
  });
  if (res.count === 0) return { error: "Session introuvable ou accès refusé." };
  revalidatePath("/my-brackets");
  return { ok: true as const };
}

export async function updateBlindtestSessionVisibility(id: string, visibility: Visibility) {
  const identity = await requireIdentity();
  if (!identity) return { error: "Connexion requise." };

  const res = await prisma.blindtestSession.updateMany({
    where: { id, playerId: identity.playerId },
    data: { visibility },
  });
  if (res.count === 0) return { error: "Session introuvable ou accès refusé." };
  revalidatePath("/my-brackets");
  return { ok: true as const };
}

export async function updateBlindtestRoomVisibility(id: string, visibility: Visibility) {
  const identity = await requireIdentity();
  if (!identity) return { error: "Connexion requise." };

  const res = await prisma.blindtestRoom.updateMany({
    where: { id, hostId: identity.playerId },
    data: { visibility },
  });
  if (res.count === 0) return { error: "Room introuvable ou accès refusé." };
  revalidatePath("/my-brackets");
  revalidatePath("/explore");
  return { ok: true as const };
}

export async function deleteBracketGame(id: string) {
  const identity = await requireIdentity();
  if (!identity) return { error: "Connexion requise." };

  const res = await prisma.bracketGame.deleteMany({
    where: { id, playerId: identity.playerId },
  });
  if (res.count === 0) return { error: "Partie introuvable ou accès refusé." };
  revalidatePath("/my-brackets");
  return { ok: true as const };
}

export async function deleteTierlistSession(id: string) {
  const identity = await requireIdentity();
  if (!identity) return { error: "Connexion requise." };

  const res = await prisma.tierlistSession.deleteMany({
    where: { id, playerId: identity.playerId },
  });
  if (res.count === 0) return { error: "Session introuvable ou accès refusé." };
  revalidatePath("/my-brackets");
  return { ok: true as const };
}

export async function deleteBlindtestSession(id: string) {
  const identity = await requireIdentity();
  if (!identity) return { error: "Connexion requise." };

  const res = await prisma.blindtestSession.deleteMany({
    where: { id, playerId: identity.playerId },
  });
  if (res.count === 0) return { error: "Session introuvable ou accès refusé." };
  revalidatePath("/my-brackets");
  return { ok: true as const };
}

export async function deleteBlindtestRoom(id: string) {
  const identity = await requireIdentity();
  if (!identity) return { error: "Connexion requise." };

  const res = await prisma.blindtestRoom.deleteMany({
    where: { id, hostId: identity.playerId },
  });
  if (res.count === 0) return { error: "Room introuvable ou accès refusé." };
  revalidatePath("/my-brackets");
  revalidatePath("/explore");
  return { ok: true as const };
}

export async function deleteBattleFeatRoom(id: string) {
  const identity = await requireIdentity();
  if (!identity) return { error: "Connexion requise." };

  const res = await prisma.battleFeatRoom.deleteMany({
    where: { id, hostId: identity.playerId },
  });
  if (res.count === 0) return { error: "Room introuvable ou accès refusé." };
  revalidatePath("/my-brackets");
  revalidatePath("/explore");
  return { ok: true as const };
}

export async function updateBattleFeatChallengeVisibility(id: string, visibility: Visibility) {
  const identity = await requireIdentity();
  if (!identity) return { error: "Connexion requise." };

  const res = await prisma.battleFeatSoloChallenge.updateMany({
    where: { id, ownerId: identity.playerId },
    data: { visibility },
  });
  if (res.count === 0) return { error: "Challenge introuvable ou accès refusé." };
  revalidatePath("/my-brackets");
  revalidatePath("/explore");
  return { ok: true as const };
}

export async function deleteBattleFeatChallenge(id: string) {
  const identity = await requireIdentity();
  if (!identity) return { error: "Connexion requise." };

  const res = await prisma.battleFeatSoloChallenge.deleteMany({
    where: { id, ownerId: identity.playerId },
  });
  if (res.count === 0) return { error: "Challenge introuvable ou accès refusé." };
  revalidatePath("/my-brackets");
  revalidatePath("/explore");
  return { ok: true as const };
}

export async function updateStreamClashVisibility(id: string, visibility: Visibility) {
  const identity = await requireIdentity();
  if (!identity) return { error: "Connexion requise." };

  const res = await prisma.streamClash.updateMany({
    where: { id, ownerId: identity.playerId },
    data: { visibility },
  });
  if (res.count === 0) return { error: "Stream Clash introuvable ou accès refusé." };
  revalidatePath("/my-brackets");
  revalidatePath("/explore");
  return { ok: true as const };
}

export async function deleteStreamClash(id: string) {
  const identity = await requireIdentity();
  if (!identity) return { error: "Connexion requise." };

  const res = await prisma.streamClash.deleteMany({
    where: { id, ownerId: identity.playerId },
  });
  if (res.count === 0) return { error: "Stream Clash introuvable ou accès refusé." };
  revalidatePath("/my-brackets");
  revalidatePath("/explore");
  return { ok: true as const };
}

export async function updateStreamClashSessionVisibility(id: string, visibility: Visibility) {
  const identity = await requireIdentity();
  if (!identity) return { error: "Connexion requise." };

  const res = await prisma.streamClashSession.updateMany({
    where: { id, playerId: identity.playerId },
    data: { visibility },
  });
  if (res.count === 0) return { error: "Session introuvable ou accès refusé." };
  revalidatePath("/my-brackets");
  return { ok: true as const };
}

export async function deleteStreamClashSession(id: string) {
  const identity = await requireIdentity();
  if (!identity) return { error: "Connexion requise." };

  const res = await prisma.streamClashSession.deleteMany({
    where: { id, playerId: identity.playerId },
  });
  if (res.count === 0) return { error: "Session introuvable ou accès refusé." };
  revalidatePath("/my-brackets");
  return { ok: true as const };
}

export async function updateStreamClashRoomVisibility(id: string, visibility: Visibility) {
  const identity = await requireIdentity();
  if (!identity) return { error: "Connexion requise." };

  const res = await prisma.streamClashRoom.updateMany({
    where: { id, hostId: identity.playerId },
    data: { visibility },
  });
  if (res.count === 0) return { error: "Room introuvable ou accès refusé." };
  revalidatePath("/my-brackets");
  revalidatePath("/explore");
  return { ok: true as const };
}

export async function deleteStreamClashRoom(id: string) {
  const identity = await requireIdentity();
  if (!identity) return { error: "Connexion requise." };

  const res = await prisma.streamClashRoom.deleteMany({
    where: { id, hostId: identity.playerId },
  });
  if (res.count === 0) return { error: "Room introuvable ou accès refusé." };
  revalidatePath("/my-brackets");
  revalidatePath("/explore");
  return { ok: true as const };
}
