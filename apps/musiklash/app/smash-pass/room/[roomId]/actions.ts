"use server";

import prisma from "@/lib/prisma";
import { resolvePlayerIdentity } from "@/lib/guest";
import { recordGlobalVote } from "@/lib/smash-pass-server";
import {
  getSmashPassRoomSnapshot,
  toSmashPassRoomSnapshot,
  type SmashPassRoomEvent,
} from "@/lib/smash-pass-room";
import {
  allParticipantsVoted,
  findParticipant,
  normalizeParticipants,
  type SmashPassChoice,
  type SmashPassItemType,
  type SmashPassParticipant,
} from "@/lib/smash-pass";
import { Prisma } from "@prisma/client";

const PRESENCE_HEARTBEAT_MIN_SECONDS = 10;

async function requirePlayer() {
  try {
    const identity = await resolvePlayerIdentity();
    return { id: identity.playerId };
  } catch {
    return null;
  }
}

function shouldHeartbeat(lastSeenAt: string | null, nowMs: number) {
  if (!lastSeenAt) return true;
  const ts = Date.parse(lastSeenAt);
  if (Number.isNaN(ts)) return true;
  return nowMs - ts >= PRESENCE_HEARTBEAT_MIN_SECONDS * 1000;
}

async function touchPresence(roomId: string, playerId: string) {
  const room = await prisma.smashPassRoom.findUnique({
    where: { id: roomId },
    select: { id: true, participants: true, status: true },
  });
  if (!room || room.status === "finished") return;

  const participants = normalizeParticipants(room.participants);
  const me = findParticipant(participants, playerId);
  if (!me) return;

  const nowMs = Date.now();
  if (!shouldHeartbeat(me.lastSeenAt, nowMs)) return;

  const updated = participants.map((p) =>
    p.playerId === playerId ? { ...p, lastSeenAt: new Date().toISOString() } : p,
  );
  const json = JSON.stringify(updated);
  await prisma.$executeRaw`UPDATE smash_pass_rooms SET participants = ${json}::jsonb WHERE id = ${room.id}::uuid`;
}

async function buildResponse(roomId: string, event: SmashPassRoomEvent) {
  const room = await getSmashPassRoomSnapshot(roomId);
  if (!room) return { ok: false as const, error: "Room introuvable" };
  return { ok: true as const, room, event };
}

export async function refreshRoomState(roomId: string) {
  const user = await requirePlayer();
  if (!user) return { ok: false as const, error: "Non authentifié" };

  await touchPresence(roomId, user.id);
  const room = await prisma.smashPassRoom.findUnique({
    where: { id: roomId },
    include: {
      smashPass: {
        select: {
          id: true,
          title: true,
          itemType: true,
          items: { orderBy: { position: "asc" } },
        },
      },
      host: { select: { id: true, username: true } },
    },
  });
  if (!room) return { ok: false as const, error: "Room introuvable" };
  return { ok: true as const, room: toSmashPassRoomSnapshot(room) };
}

export async function joinRoom(roomId: string) {
  const user = await requirePlayer();
  if (!user) return { ok: false as const, error: "Non authentifié" };

  const room = await prisma.smashPassRoom.findUnique({ where: { id: roomId } });
  if (!room) return { ok: false as const, error: "Room introuvable" };
  if (room.status !== "waiting") {
    return { ok: false as const, error: "Partie déjà commencée" };
  }

  const participants = normalizeParticipants(room.participants);
  if (findParticipant(participants, user.id)) {
    const snap = await getSmashPassRoomSnapshot(roomId);
    if (!snap) return { ok: false as const, error: "Room introuvable" };
    return {
      ok: true as const,
      room: snap,
      event: {
        type: "player-joined" as const,
        playerId: user.id,
        username: findParticipant(snap.participants, user.id)?.username ?? "Joueur",
      },
    };
  }

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { username: true },
  });
  const username = profile?.username ?? "Joueur";
  const nowIso = new Date().toISOString();

  const newParticipant: SmashPassParticipant = {
    playerId: user.id,
    username,
    smashCount: 0,
    passCount: 0,
    choices: {},
    lastSeenAt: nowIso,
    joinedAt: nowIso,
  };

  await prisma.smashPassRoom.update({
    where: { id: roomId },
    data: { participants: [...participants, newParticipant] as unknown as Prisma.JsonArray },
  });

  return buildResponse(roomId, { type: "player-joined", playerId: user.id, username });
}

export async function leaveRoom(roomId: string) {
  const user = await requirePlayer();
  if (!user) return { ok: false as const, error: "Non authentifié" };

  const room = await prisma.smashPassRoom.findUnique({ where: { id: roomId } });
  if (!room) return { ok: false as const, error: "Room introuvable" };
  if (room.status !== "waiting") {
    return { ok: false as const, error: "Partie commencée" };
  }
  if (room.hostId === user.id) {
    return { ok: false as const, error: "L'hôte ne peut pas quitter" };
  }

  const participants = normalizeParticipants(room.participants);
  const updated = participants.filter((p) => p.playerId !== user.id);
  await prisma.smashPassRoom.update({
    where: { id: roomId },
    data: { participants: updated as unknown as Prisma.JsonArray },
  });
  return buildResponse(roomId, { type: "player-left", playerId: user.id });
}

export async function startGame(roomId: string) {
  const user = await requirePlayer();
  if (!user) return { ok: false as const, error: "Non authentifié" };

  const room = await prisma.smashPassRoom.findUnique({
    where: { id: roomId },
    include: { smashPass: { include: { items: true } } },
  });
  if (!room) return { ok: false as const, error: "Room introuvable" };
  if (room.hostId !== user.id) {
    return { ok: false as const, error: "Seul l'hôte peut lancer la partie" };
  }
  if (room.status !== "waiting") {
    return { ok: false as const, error: "Partie déjà en cours" };
  }

  const participants = normalizeParticipants(room.participants);
  if (participants.length < 1) {
    return { ok: false as const, error: "Au moins 1 joueur requis" };
  }
  if (room.smashPass.items.length < 1) {
    return { ok: false as const, error: "Deck vide" };
  }

  const nowIso = new Date().toISOString();
  const reset = participants.map((p) => ({
    ...p,
    smashCount: 0,
    passCount: 0,
    choices: {},
    lastSeenAt: nowIso,
  }));

  await prisma.smashPassRoom.update({
    where: { id: roomId },
    data: {
      status: "playing",
      currentPosition: 0,
      winnerId: null,
      positionStartedAt: new Date(),
      participants: reset as unknown as Prisma.JsonArray,
    },
  });

  return buildResponse(roomId, { type: "game-start" });
}

export async function submitVote(roomId: string, choice: SmashPassChoice) {
  const user = await requirePlayer();
  if (!user) return { ok: false as const, error: "Non authentifié" };

  const room = await prisma.smashPassRoom.findUnique({
    where: { id: roomId },
    include: {
      smashPass: { include: { items: { orderBy: { position: "asc" } } } },
    },
  });
  if (!room) return { ok: false as const, error: "Room introuvable" };
  if (room.status !== "playing") {
    return { ok: false as const, error: "Partie non en cours" };
  }

  const position = room.currentPosition;
  const item = room.smashPass.items.find((i) => i.position === position);
  if (!item) return { ok: false as const, error: "Élément introuvable" };

  const participants = normalizeParticipants(room.participants);
  const me = findParticipant(participants, user.id);
  if (!me) return { ok: false as const, error: "Tu n'es pas dans cette room" };

  const key = String(position);
  if (me.choices[key] === "smash" || me.choices[key] === "pass") {
    return { ok: false as const, error: "Déjà voté" };
  }

  const itemType = room.smashPass.itemType as SmashPassItemType;
  const stats = await recordGlobalVote(itemType, Number(item.deezerId), choice);

  const updated = participants.map((p) => {
    if (p.playerId !== user.id) return p;
    return {
      ...p,
      choices: { ...p.choices, [key]: choice },
      smashCount: p.smashCount + (choice === "smash" ? 1 : 0),
      passCount: p.passCount + (choice === "pass" ? 1 : 0),
      lastSeenAt: new Date().toISOString(),
    };
  });

  await prisma.smashPassRoom.update({
    where: { id: roomId },
    data: { participants: updated as unknown as Prisma.JsonArray },
  });

  const snap = await getSmashPassRoomSnapshot(roomId);
  if (!snap) return { ok: false as const, error: "Room introuvable" };

  return {
    ok: true as const,
    room: snap,
    event: { type: "vote-submitted" as const, playerId: user.id, position },
    stats,
  };
}

export async function advancePosition(roomId: string) {
  const user = await requirePlayer();
  if (!user) return { ok: false as const, error: "Non authentifié" };

  const room = await prisma.smashPassRoom.findUnique({
    where: { id: roomId },
    include: { smashPass: { include: { items: true } } },
  });
  if (!room) return { ok: false as const, error: "Room introuvable" };
  if (room.hostId !== user.id) {
    return { ok: false as const, error: "Seul l'hôte peut avancer" };
  }
  if (room.status !== "playing") {
    return { ok: false as const, error: "Partie non en cours" };
  }

  const participants = normalizeParticipants(room.participants);
  if (!allParticipantsVoted(participants, room.currentPosition)) {
    return { ok: false as const, error: "Tous les joueurs doivent voter" };
  }

  const totalItems = room.smashPass.items.length;
  const nextPosition = room.currentPosition + 1;

  if (nextPosition >= totalItems) {
    await prisma.smashPassRoom.update({
      where: { id: roomId },
      data: {
        status: "finished",
        positionStartedAt: null,
      },
    });
    return buildResponse(roomId, { type: "game-end", winnerId: null });
  }

  await prisma.smashPassRoom.update({
    where: { id: roomId },
    data: {
      currentPosition: nextPosition,
      positionStartedAt: new Date(),
    },
  });

  const snap = await getSmashPassRoomSnapshot(roomId);
  if (!snap) return { ok: false as const, error: "Room introuvable" };
  return {
    ok: true as const,
    room: snap,
    event: { type: "advanced" as const, currentPosition: snap.currentPosition },
  };
}

export async function rematch(roomId: string) {
  const user = await requirePlayer();
  if (!user) return { ok: false as const, error: "Non authentifié" };

  const room = await prisma.smashPassRoom.findUnique({ where: { id: roomId } });
  if (!room) return { ok: false as const, error: "Room introuvable" };

  const participants = normalizeParticipants(room.participants);
  if (!findParticipant(participants, user.id)) {
    return { ok: false as const, error: "Tu n'es pas dans cette room" };
  }

  const nowIso = new Date().toISOString();
  const reset = participants.map((p) => ({
    ...p,
    smashCount: 0,
    passCount: 0,
    choices: {},
    lastSeenAt: nowIso,
  }));

  await prisma.smashPassRoom.update({
    where: { id: roomId },
    data: {
      status: "waiting",
      currentPosition: 0,
      winnerId: null,
      positionStartedAt: null,
      participants: reset as unknown as Prisma.JsonArray,
    },
  });

  return buildResponse(roomId, { type: "rematch" });
}
