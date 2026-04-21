"use server";

import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { resolvePlayerIdentity } from "@/lib/guest";
import {
  canClaimTurnTimeout,
  getBattleFeatRoomSnapshot,
  pickJokerMoveDeezer,
  validateFeatLinkDeezerBidirectional,
} from "@/lib/battle-feat-server";
import type { RoomEvent } from "@/lib/battle-feat";

const TURN_SECONDS = 20;
const PRESENCE_HEARTBEAT_MIN_SECONDS = 10;
const PRESENCE_GRACE_SECONDS = 45;

type MoveArtistInput = {
  id: string;
  name: string;
  pictureUrl: string | null;
};

async function requirePlayer() {
  try {
    const identity = await resolvePlayerIdentity();
    return { id: identity.playerId };
  } catch {
    return null;
  }
}

async function buildRoomResponse(roomId: string, event?: RoomEvent) {
  const room = await getBattleFeatRoomSnapshot(roomId);
  if (!room) return { ok: false, error: "Room introuvable" } as const;
  return { ok: true, room, event };
}

/** Re-fetch room from DB — fallback when Realtime broadcast does not reach every client. */
export async function refreshRoomState(roomId: string) {
  const user = await requirePlayer();
  if (!user) return { ok: false, error: "Non authentifié" } as const;

  await touchPresenceAndResolve(roomId, user.id);
  const room = await getBattleFeatRoomSnapshot(roomId);
  if (!room) return { ok: false, error: "Room introuvable" } as const;
  return { ok: true, room } as const;
}

function getWinnerId(room: { hostId: string; guestId: string | null }, loserId: string) {
  return loserId === room.hostId ? room.guestId : room.hostId;
}

function normalizeUsedArtistIds(value: unknown) {
  return Array.isArray(value) ? value.filter((e): e is string => typeof e === "string") : [];
}

function normalizeMoves(value: unknown) {
  return Array.isArray(value) ? (value as Prisma.JsonArray) : ([] as Prisma.JsonArray);
}

function isPresenceStale(lastSeenAt: Date | null, nowMs: number) {
  if (!lastSeenAt) return true;
  return nowMs - lastSeenAt.getTime() > PRESENCE_GRACE_SECONDS * 1000;
}

function shouldHeartbeat(lastSeenAt: Date | null, nowMs: number) {
  if (!lastSeenAt) return true;
  return nowMs - lastSeenAt.getTime() >= PRESENCE_HEARTBEAT_MIN_SECONDS * 1000;
}

async function touchPresenceAndResolve(roomId: string, playerId: string): Promise<void> {
  const room = await prisma.battleFeatRoom.findUnique({
    where: { id: roomId },
    select: {
      id: true,
      hostId: true,
      guestId: true,
      status: true,
      hostLastSeenAt: true,
      guestLastSeenAt: true,
    },
  });
  if (!room || room.status === "finished") return;

  const now = new Date();
  const nowMs = now.getTime();
  const isHost = playerId === room.hostId;
  const isGuest = playerId === room.guestId;

  // Use raw SQL so the heartbeat does NOT bump `updated_at` — otherwise the
  // client-side turn timer (which is anchored on `updatedAt`) would reset every
  // time a player sends a heartbeat.
  if (isHost && shouldHeartbeat(room.hostLastSeenAt, nowMs)) {
    await prisma.$executeRaw`UPDATE battle_feat_rooms SET host_last_seen_at = ${now} WHERE id = ${room.id}::uuid`;
    room.hostLastSeenAt = now;
  } else if (isGuest && shouldHeartbeat(room.guestLastSeenAt, nowMs)) {
    await prisma.$executeRaw`UPDATE battle_feat_rooms SET guest_last_seen_at = ${now} WHERE id = ${room.id}::uuid`;
    room.guestLastSeenAt = now;
  }

  const hostStale = isPresenceStale(room.hostLastSeenAt, nowMs);
  const guestStale = room.guestId ? isPresenceStale(room.guestLastSeenAt, nowMs) : false;

  if (room.status === "waiting" && room.guestId && guestStale && !hostStale) {
    await prisma.battleFeatRoom.update({
      where: { id: room.id },
      data: { guestId: null, guestLastSeenAt: null },
    });
    return;
  }

  if (room.status === "waiting" && room.guestId && hostStale && !guestStale) {
    // Host left the lobby before the game started — promote the guest to host
    // so the session can continue (wait for a new opponent, rematch, etc.)
    // instead of declaring a spurious winner.
    await prisma.battleFeatRoom.update({
      where: { id: room.id },
      data: {
        hostId: room.guestId,
        guestId: null,
        hostLastSeenAt: room.guestLastSeenAt ?? new Date(),
        guestLastSeenAt: null,
      },
    });
    return;
  }

  if (room.status === "playing" && room.guestId && hostStale !== guestStale) {
    const winnerId = hostStale ? room.guestId : room.hostId;
    await prisma.battleFeatRoom.update({
      where: { id: room.id },
      data: { status: "finished", winnerId, currentTurnId: null },
    });
  }
}

async function finishRoomWithLoss(
  roomId: string,
  room: { hostId: string; guestId: string | null },
  loserId: string,
) {
  await prisma.battleFeatRoom.update({
    where: { id: roomId },
    data: { status: "finished", winnerId: getWinnerId(room, loserId) },
  });
}

async function applyMoveToRoom(
  roomId: string,
  actorId: string,
  actorIsHost: boolean,
  room: { hostId: string; guestId: string | null; usedArtistIds: unknown; moves: unknown },
  artist: MoveArtistInput,
  trackTitle: string | null,
  previewUrl: string | null,
  options?: { decrementJokerField?: "hostJokers" | "guestJokers" },
) {
  const nextTurnId = actorIsHost ? room.guestId : room.hostId;
  const usedArtistIds = [...normalizeUsedArtistIds(room.usedArtistIds), artist.id];
  const moves = [
    ...normalizeMoves(room.moves),
    {
      artistId: artist.id,
      artistName: artist.name,
      pictureUrl: artist.pictureUrl,
      trackTitle,
      previewUrl,
      ts: Date.now(),
    },
  ] as Prisma.JsonArray;

  const updateData: Prisma.BattleFeatRoomUpdateInput = {
    currentArtistId: artist.id,
    currentArtistName: artist.name,
    currentArtistPic: artist.pictureUrl,
    currentTurnId: nextTurnId,
    usedArtistIds,
    moves,
    hostScore: actorIsHost ? { increment: 1 } : undefined,
    guestScore: actorIsHost ? undefined : { increment: 1 },
    hostLastSeenAt: actorIsHost ? new Date() : undefined,
    guestLastSeenAt: actorIsHost ? undefined : new Date(),
  };

  if (options?.decrementJokerField === "hostJokers") updateData.hostJokers = { decrement: 1 };
  if (options?.decrementJokerField === "guestJokers") updateData.guestJokers = { decrement: 1 };

  await prisma.battleFeatRoom.update({ where: { id: roomId }, data: updateData });

  return { nextTurnId, usedArtistIds, trackTitle, playerId: actorId };
}

export async function joinRoom(roomId: string) {
  const user = await requirePlayer();
  if (!user) return { ok: false, error: "Non authentifié" } as const;

  const room = await prisma.battleFeatRoom.findUnique({ where: { id: roomId } });
  if (!room) return { ok: false, error: "Room introuvable" } as const;
  if (room.guestId && room.guestId !== user.id) return { ok: false, error: "Room pleine" } as const;
  if (room.hostId === user.id) return { ok: false, error: "Tu es déjà l'hôte" } as const;

  await prisma.battleFeatRoom.update({
    where: { id: roomId },
    data: { guestId: user.id, guestLastSeenAt: new Date() },
  });

  const snapshot = await getBattleFeatRoomSnapshot(roomId);
  if (!snapshot) return { error: "Room introuvable" };

  return {
    ok: true,
    room: snapshot,
    event: { type: "guest-joined", guestName: snapshot.guestUsername ?? "Adversaire" } as const,
  };
}

export async function startGame(
  roomId: string,
  startingArtistId: string,
  startingArtistName: string,
  startingArtistPic: string | null,
) {
  const user = await requirePlayer();
  if (!user) return { ok: false, error: "Non authentifié" } as const;

  const room = await prisma.battleFeatRoom.findUnique({ where: { id: roomId } });
  if (!room) return { ok: false, error: "Room introuvable" } as const;
  if (room.hostId !== user.id) return { ok: false, error: "Seul l'hôte peut lancer la partie" } as const;
  if (!room.guestId) return { ok: false, error: "En attente d'un adversaire" } as const;

  await prisma.battleFeatRoom.update({
    where: { id: roomId },
    data: {
      status: "playing",
      winnerId: null,
      startingArtistId,
      startingArtistName,
      startingArtistPic,
      currentArtistId: startingArtistId,
      currentArtistName: startingArtistName,
      currentArtistPic: startingArtistPic,
      currentTurnId: room.guestId,
      usedArtistIds: [startingArtistId],
      moves: [],
      hostScore: 0,
      guestScore: 0,
      hostJokers: 1,
      guestJokers: 1,
      hostLastSeenAt: new Date(),
      guestLastSeenAt: new Date(),
    },
  });

  const snapshot = await getBattleFeatRoomSnapshot(roomId);
  if (!snapshot) return { ok: false, error: "Room introuvable" } as const;

  return {
    ok: true,
    room: snapshot,
    event: {
      type: "game-start",
      startingArtistId,
      startingArtistName,
      startingArtistPic,
      firstTurnId: snapshot.currentTurnId ?? room.guestId,
    } as const,
  };
}

export async function submitMove(roomId: string, artist: MoveArtistInput) {
  const user = await requirePlayer();
  if (!user) return { ok: false, valid: false, error: "Non authentifié" } as const;

  const room = await prisma.battleFeatRoom.findUnique({ where: { id: roomId } });
  if (!room) return { ok: false, valid: false, error: "Room introuvable" } as const;
  if (room.status !== "playing") return { ok: false, valid: false, error: "Partie non en cours" } as const;
  if (room.currentTurnId !== user.id) return { ok: false, valid: false, error: "Pas ton tour" } as const;
  if (!room.currentArtistId || !room.currentArtistName) {
    return { ok: false, valid: false, error: "Pas d'artiste courant" } as const;
  }

  const usedArtistIds = normalizeUsedArtistIds(room.usedArtistIds);
  if (usedArtistIds.includes(artist.id)) {
    await finishRoomWithLoss(roomId, room, user.id);
    const response = await buildRoomResponse(roomId, { type: "invalid-move", playerId: user.id });
    if (!response.ok) return { ok: false, valid: false, error: response.error } as const;
    return { ok: true, valid: false, error: "Artiste déjà utilisé !", room: response.room, event: response.event } as const;
  }

  const feat = await validateFeatLinkDeezerBidirectional(
    room.currentArtistId,
    room.currentArtistName,
    artist.id,
    artist.name,
  );

  if (!feat) {
    await finishRoomWithLoss(roomId, room, user.id);
    const response = await buildRoomResponse(roomId, { type: "invalid-move", playerId: user.id });
    if (!response.ok) return { ok: false, valid: false, error: response.error } as const;
    return { ok: true, valid: false, error: "Pas de featuring valide !", room: response.room, event: response.event } as const;
  }

  const actorIsHost = user.id === room.hostId;
  const moveResult = await applyMoveToRoom(roomId, user.id, actorIsHost, room, artist, feat.trackTitle ?? null, feat.previewUrl ?? null);

  const response = await buildRoomResponse(roomId, {
    type: "move",
    artistId: artist.id,
    artistName: artist.name,
    artistPic: artist.pictureUrl,
    trackTitle: moveResult.trackTitle,
    nextTurnId: moveResult.nextTurnId ?? "",
    usedIds: moveResult.usedArtistIds,
  });
  if (!response.ok) return { ok: false, valid: false, error: response.error } as const;
  return { ok: true, valid: true, trackTitle: moveResult.trackTitle, previewUrl: feat.previewUrl ?? null, room: response.room, event: response.event } as const;
}

export async function useJoker(roomId: string) {
  const user = await requirePlayer();
  if (!user) return { ok: false, error: "Non authentifié" } as const;

  const room = await prisma.battleFeatRoom.findUnique({ where: { id: roomId } });
  if (!room) return { ok: false, error: "Room introuvable" } as const;
  if (room.status !== "playing") return { ok: false, error: "Partie non en cours" } as const;
  if (room.currentTurnId !== user.id) return { ok: false, error: "Pas ton tour" } as const;
  if (!room.currentArtistId) return { ok: false, error: "Pas d'artiste courant" } as const;

  const actorIsHost = user.id === room.hostId;
  const jokersLeft = actorIsHost ? room.hostJokers : room.guestJokers;
  if (jokersLeft < 1) return { ok: false, error: "Plus de joker" } as const;

  const jokerArtist = await pickJokerMoveDeezer(
    room.currentArtistId,
    normalizeUsedArtistIds(room.usedArtistIds),
  );
  if (!jokerArtist) return { ok: false, error: "Aucun coup disponible" } as const;

  const moveResult = await applyMoveToRoom(
    roomId,
    user.id,
    actorIsHost,
    room,
    { id: jokerArtist.id, name: jokerArtist.name, pictureUrl: jokerArtist.pictureUrl },
    jokerArtist.trackTitle ?? null,
    jokerArtist.previewUrl ?? null,
    { decrementJokerField: actorIsHost ? "hostJokers" : "guestJokers" },
  );

  const response = await buildRoomResponse(roomId, {
    type: "joker-used",
    playerId: user.id,
    artistId: jokerArtist.id,
    artistName: jokerArtist.name,
    artistPic: jokerArtist.pictureUrl,
  });
  if (!response.ok) return { ok: false, error: response.error } as const;
  return { ok: true, room: response.room, event: response.event, jokerArtist, trackTitle: moveResult.trackTitle } as const;
}

export async function rematch(roomId: string) {
  const user = await requirePlayer();
  if (!user) return { ok: false, error: "Non authentifié" } as const;

  const room = await prisma.battleFeatRoom.findUnique({ where: { id: roomId } });
  if (!room) return { ok: false, error: "Room introuvable" } as const;
  if (room.hostId !== user.id && room.guestId !== user.id) {
    return { ok: false, error: "Tu n'es pas dans cette room" } as const;
  }

  // Reset both presence timestamps: the results screen does not poll, so the
  // non-caller's `lastSeenAt` can be many seconds stale. Starting a fresh grace
  // window here prevents a spurious "opponent disconnected" warning right after
  // the room returns to "waiting". Real absence is detected normally by the
  // heartbeat that follows.
  const now = new Date();
  await prisma.battleFeatRoom.update({
    where: { id: roomId },
    data: {
      status: "waiting",
      startingArtistId: null,
      startingArtistName: null,
      startingArtistPic: null,
      currentArtistId: null,
      currentArtistName: null,
      currentArtistPic: null,
      currentTurnId: null,
      usedArtistIds: [],
      moves: [],
      hostScore: 0,
      guestScore: 0,
      hostJokers: 1,
      guestJokers: 1,
      winnerId: null,
      hostLastSeenAt: now,
      guestLastSeenAt: now,
    },
  });

  const response = await buildRoomResponse(roomId, { type: "rematch" } as RoomEvent);
  if (!response.ok) return { ok: false, error: response.error } as const;
  return { ok: true, room: response.room, event: response.event } as const;
}

export async function endGameTimeout(roomId: string) {
  const user = await requirePlayer();
  if (!user) return { ok: false, error: "Non authentifié" } as const;

  const room = await prisma.battleFeatRoom.findUnique({ where: { id: roomId } });
  if (!room) return { ok: false, error: "Room introuvable" } as const;
  if (room.status !== "playing") return { ok: false, error: "Partie non en cours" } as const;
  if (room.currentTurnId !== user.id) return { ok: false, error: "Pas ton tour" } as const;
  if (!canClaimTurnTimeout(room.updatedAt, TURN_SECONDS)) {
    return { ok: false, error: "Temps non écoulé côté serveur" } as const;
  }

  await finishRoomWithLoss(roomId, room, user.id);

  const response = await buildRoomResponse(roomId, { type: "timeout", loserId: user.id });
  if (!response.ok) return response;

  return {
    ok: true,
    room: response.room,
    event: response.event,
    winnerId: response.room.winnerId,
    loserId: user.id,
  };
}
