"use server";

import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { resolvePlayerIdentity } from "@/lib/guest";
import {
  getTierlistRoomSnapshot,
  normalizeParticipants,
  normalizePlacements,
  normalizeTierlistBallots,
  type TierlistBallot,
} from "@/lib/collaborative-room";
import { DEFAULT_TIERS } from "@/lib/tierlist-tiers";

async function identity() {
  try {
    return await resolvePlayerIdentity();
  } catch {
    return null;
  }
}

async function response(roomId: string) {
  const room = await getTierlistRoomSnapshot(roomId);
  return room ? { ok: true as const, room } : { ok: false as const, error: "Room introuvable." };
}

export async function refreshTierlistRoom(roomId: string) {
  return response(roomId);
}

export async function joinTierlistRoom(roomId: string) {
  const user = await identity();
  if (!user) return { ok: false as const, error: "Connexion requise." };
  const room = await prisma.tierlistRoom.findUnique({ where: { id: roomId } });
  if (!room) return { ok: false as const, error: "Room introuvable." };
  if (room.status !== "waiting") return { ok: false as const, error: "La partie a déjà commencé." };
  const participants = normalizeParticipants(room.participants);
  if (!participants.some((participant) => participant.playerId === user.playerId)) {
    await prisma.tierlistRoom.update({
      where: { id: roomId },
      data: {
        participants: [
          ...participants,
          { playerId: user.playerId, username: user.username },
        ] as unknown as Prisma.JsonArray,
      },
    });
  }
  return response(roomId);
}

export async function startTierlistRoom(roomId: string) {
  const user = await identity();
  if (!user) return { ok: false as const, error: "Connexion requise." };
  const room = await prisma.tierlistRoom.findUnique({ where: { id: roomId } });
  if (!room) return { ok: false as const, error: "Room introuvable." };
  if (room.hostId !== user.playerId)
    return { ok: false as const, error: "Seul l’hôte peut lancer la partie." };
  if (room.status !== "waiting") return { ok: false as const, error: "La partie est déjà lancée." };
  if (normalizeParticipants(room.participants).length < 2)
    return { ok: false as const, error: "Il faut au moins 2 joueurs." };
  await prisma.tierlistRoom.update({
    where: { id: roomId },
    data: { status: "playing", currentPosition: 0, placements: {}, ballots: [] },
  });
  return response(roomId);
}

function majorityTier(ballots: TierlistBallot[]): string {
  const counts = new Map<string, number>();
  for (const ballot of ballots) counts.set(ballot.tierId, (counts.get(ballot.tierId) ?? 0) + 1);
  const top = Math.max(...counts.values());
  const tied = [...counts].filter(([, count]) => count === top).map(([tierId]) => tierId);
  return tied[Math.floor(Math.random() * tied.length)]!;
}

export async function voteTierlistRoom(roomId: string, tierId: string) {
  const user = await identity();
  if (!user) return { ok: false as const, error: "Connexion requise." };
  if (!DEFAULT_TIERS.some((tier) => tier.id === tierId))
    return { ok: false as const, error: "Rang invalide." };
  const room = await prisma.tierlistRoom.findUnique({
    where: { id: roomId },
    include: { tierlist: { select: { tracks: true } } },
  });
  if (!room) return { ok: false as const, error: "Room introuvable." };
  if (room.status !== "playing")
    return { ok: false as const, error: "La partie n’est pas en cours." };
  const participants = normalizeParticipants(room.participants);
  if (!participants.some((participant) => participant.playerId === user.playerId))
    return { ok: false as const, error: "Rejoins la room avant de voter." };
  if (!room.tierlist.tracks.some((track) => track.position === room.currentPosition))
    return { ok: false as const, error: "Ce morceau n’est plus actif." };
  const ballots = normalizeTierlistBallots(room.ballots);
  if (ballots.some((ballot) => ballot.playerId === user.playerId))
    return { ok: false as const, error: "Tu as déjà voté pour ce morceau." };
  const nextBallots = [...ballots, { playerId: user.playerId, tierId }];
  if (nextBallots.length < participants.length) {
    await prisma.tierlistRoom.update({
      where: { id: roomId },
      data: { ballots: nextBallots as unknown as Prisma.JsonArray },
    });
    return response(roomId);
  }
  const placements = normalizePlacements(room.placements);
  const result = majorityTier(nextBallots);
  const nextPlacements = { ...placements, [String(room.currentPosition)]: result };
  const positions = room.tierlist.tracks.map((track) => track.position).sort((a, b) => a - b);
  const currentIndex = positions.indexOf(room.currentPosition);
  const nextPosition = positions[currentIndex + 1] ?? room.currentPosition;
  const finished = currentIndex === -1 || currentIndex >= positions.length - 1;
  await prisma.tierlistRoom.update({
    where: { id: roomId },
    data: {
      placements: nextPlacements as unknown as Prisma.JsonObject,
      ballots: [],
      currentPosition: nextPosition,
      status: finished ? "finished" : "playing",
    },
  });
  return response(roomId);
}
