"use server";

import prisma from "@/lib/prisma";
import { resolvePlayerIdentity } from "@/lib/guest";
import { recordGlobalVote, getGlobalStats } from "@/lib/smash-pass-server";
import {
  normalizeSessionChoices,
  type SmashPassChoice,
  type SmashPassItemType,
} from "@/lib/smash-pass";
import type { Prisma } from "@prisma/client";

export async function startSmashPassSession(smashPassId: string) {
  let identity: { playerId: string };
  try {
    identity = await resolvePlayerIdentity();
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Impossible de démarrer la session.";
    return { error: msg };
  }

  try {
    const session = await prisma.smashPassSession.create({
      data: {
        smashPassId,
        playerId: identity.playerId,
        visibility: "private",
      },
    });
    return { sessionId: session.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur session.";
    return { error: msg };
  }
}

export async function submitSmashPassChoice(
  sessionId: string,
  itemType: SmashPassItemType,
  externalId: number,
  position: number,
  choice: SmashPassChoice,
) {
  let identity: { playerId: string };
  try {
    identity = await resolvePlayerIdentity();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Connexion requise.";
    return { error: msg };
  }

  const session = await prisma.smashPassSession.findUnique({
    where: { id: sessionId },
    select: { id: true, playerId: true, choices: true, smashCount: true, passCount: true },
  });

  if (!session || session.playerId !== identity.playerId) {
    return { error: "Session introuvable." };
  }

  const choices = normalizeSessionChoices(session.choices);
  if (choices.some((c) => c.position === position)) {
    return { error: "Déjà voté pour cet élément." };
  }

  const stats = await recordGlobalVote(itemType, externalId, choice);
  const nextChoices = [...choices, { position, choice }];
  const smashCount = session.smashCount + (choice === "smash" ? 1 : 0);
  const passCount = session.passCount + (choice === "pass" ? 1 : 0);

  await prisma.smashPassSession.update({
    where: { id: sessionId },
    data: {
      choices: nextChoices as unknown as Prisma.JsonArray,
      smashCount,
      passCount,
    },
  });

  return { ok: true as const, stats, smashCount, passCount };
}

export async function finishSmashPassSession(
  sessionId: string,
  visibility: "private" | "public" = "private",
) {
  await prisma.smashPassSession.update({
    where: { id: sessionId },
    data: { visibility },
  });
  return { ok: true as const };
}

export async function fetchItemStats(
  itemType: SmashPassItemType,
  externalId: number,
) {
  const stats = await getGlobalStats(itemType, externalId);
  return { stats };
}

export async function deleteTransientSmashPass(smashPassId: string) {
  let identity: { playerId: string };
  try {
    identity = await resolvePlayerIdentity();
  } catch {
    return { error: "Connexion requise." };
  }

  const res = await prisma.smashPass.deleteMany({
    where: { id: smashPassId, ownerId: identity.playerId },
  });
  if (res.count === 0) {
    return { error: "Deck introuvable ou accès refusé." };
  }
  return { ok: true as const };
}
