"use server";

import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { resolvePlayerIdentity } from "@/lib/guest";
import {
  canClaimTurnTimeout,
  findBattleFeatParticipant,
  getBattleFeatRoomSnapshot,
  nextActiveParticipant,
  normalizeBattleFeatParticipants,
  normalizeUsedArtistIds,
  pickJokerMove,
  validateCoAppearance,
} from "@/lib/battle-feat-server";
import type { BattleFeatParticipant, RoomEvent } from "@/lib/battle-feat";

const TURN_SECONDS = 20;
const PRESENCE_HEARTBEAT_MIN_SECONDS = 10;

type MoveCharacterInput = {
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
  return { ok: true, room, event } as const;
}

function normalizeMoves(value: unknown) {
  return Array.isArray(value) ? (value as Prisma.JsonArray) : ([] as Prisma.JsonArray);
}

function shouldHeartbeat(lastSeenAt: string | null, nowMs: number) {
  if (!lastSeenAt) return true;
  const ts = Date.parse(lastSeenAt);
  if (Number.isNaN(ts)) return true;
  return nowMs - ts >= PRESENCE_HEARTBEAT_MIN_SECONDS * 1000;
}

async function touchPresence(roomId: string, playerId: string) {
  const room = await prisma.battleFeatRoom.findUnique({
    where: { id: roomId },
    select: { id: true, participants: true, status: true },
  });
  if (!room || room.status === "finished") return;
  const participants = normalizeBattleFeatParticipants(room.participants);
  const me = findBattleFeatParticipant(participants, playerId);
  if (!me) return;
  if (!shouldHeartbeat(me.lastSeenAt, Date.now())) return;
  const updated = participants.map((p) =>
    p.playerId === playerId ? { ...p, lastSeenAt: new Date().toISOString() } : p,
  );
  const json = JSON.stringify(updated);
  await prisma.$executeRaw`UPDATE battle_feat_rooms SET participants = ${json}::jsonb WHERE id = ${room.id}::uuid`;
}

export async function refreshRoomState(roomId: string) {
  const user = await requirePlayer();
  if (!user) return { ok: false, error: "Non authentifié" } as const;
  await touchPresence(roomId, user.id);
  const room = await getBattleFeatRoomSnapshot(roomId);
  if (!room) return { ok: false, error: "Room introuvable" } as const;
  return { ok: true, room } as const;
}

type RoomRow = {
  id: string;
  hostId: string;
  status: string;
  currentArtistId: string | null;
  currentArtistName: string | null;
  currentArtistPic: string | null;
  currentTurnId: string | null;
  usedArtistIds: unknown;
  moves: unknown;
  participants: unknown;
  updatedAt: Date;
};

async function eliminateAndAdvance(
  roomId: string,
  room: RoomRow,
  loserId: string,
): Promise<{ winnerId: string | null; participants: BattleFeatParticipant[] }> {
  const participants = normalizeBattleFeatParticipants(room.participants);
  const updated = participants.map((p) =>
    p.playerId === loserId ? { ...p, eliminated: true } : p,
  );
  const active = updated.filter((p) => !p.eliminated);

  if (active.length <= 1) {
    const winnerId = active.length === 1 ? active[0].playerId : null;
    await prisma.battleFeatRoom.update({
      where: { id: roomId },
      data: {
        status: "finished",
        winnerId,
        currentTurnId: null,
        participants: updated as unknown as Prisma.JsonArray,
      },
    });
    return { winnerId, participants: updated };
  }

  const next = nextActiveParticipant(updated, loserId);
  await prisma.battleFeatRoom.update({
    where: { id: roomId },
    data: {
      currentTurnId: next?.playerId ?? null,
      participants: updated as unknown as Prisma.JsonArray,
    },
  });
  return { winnerId: null, participants: updated };
}

async function applyMoveToRoom(
  roomId: string,
  actorId: string,
  room: RoomRow,
  character: MoveCharacterInput,
  trackTitle: string | null,
  options?: { decrementJoker?: boolean },
) {
  const participants = normalizeBattleFeatParticipants(room.participants);
  const nextParticipant = nextActiveParticipant(participants, actorId);
  const nextTurnId = nextParticipant?.playerId ?? null;

  const usedArtistIds = [...normalizeUsedArtistIds(room.usedArtistIds), character.id];
  const moves = [
    ...normalizeMoves(room.moves),
    {
      artistId: character.id,
      artistName: character.name,
      pictureUrl: character.pictureUrl,
      trackTitle,
      previewUrl: null,
      ts: Date.now(),
      playerId: actorId,
    },
  ] as Prisma.JsonArray;

  const updatedParticipants = participants.map((p) =>
    p.playerId === actorId
      ? {
          ...p,
          score: p.score + 1,
          jokers: options?.decrementJoker ? Math.max(0, p.jokers - 1) : p.jokers,
          lastSeenAt: new Date().toISOString(),
        }
      : p,
  );

  await prisma.battleFeatRoom.update({
    where: { id: roomId },
    data: {
      currentArtistId: character.id,
      currentArtistName: character.name,
      currentArtistPic: character.pictureUrl,
      currentTurnId: nextTurnId,
      usedArtistIds,
      moves,
      participants: updatedParticipants as unknown as Prisma.JsonArray,
    },
  });

  return { nextTurnId, usedArtistIds, trackTitle };
}

export async function joinRoom(roomId: string) {
  const user = await requirePlayer();
  if (!user) return { ok: false, error: "Non authentifié" } as const;

  const room = await prisma.battleFeatRoom.findUnique({ where: { id: roomId } });
  if (!room) return { ok: false, error: "Room introuvable" } as const;
  if (room.status !== "waiting") return { ok: false, error: "Partie déjà commencée" } as const;

  const participants = normalizeBattleFeatParticipants(room.participants);
  if (findBattleFeatParticipant(participants, user.id)) {
    const snap = await getBattleFeatRoomSnapshot(roomId);
    if (!snap) return { ok: false, error: "Room introuvable" } as const;
    const me = findBattleFeatParticipant(snap.participants, user.id);
    return {
      ok: true,
      room: snap,
      event: {
        type: "player-joined",
        playerId: user.id,
        username: me?.username ?? "Joueur",
      } as const,
    } as const;
  }

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { username: true },
  });
  const nowIso = new Date().toISOString();
  const newParticipant: BattleFeatParticipant = {
    playerId: user.id,
    username: profile?.username ?? "Joueur",
    score: 0,
    jokers: 1,
    eliminated: false,
    position: participants.length,
    lastSeenAt: nowIso,
    joinedAt: nowIso,
  };
  const updated = [...participants, newParticipant];

  await prisma.battleFeatRoom.update({
    where: { id: roomId },
    data: { participants: updated as unknown as Prisma.JsonArray },
  });

  return buildRoomResponse(roomId, {
    type: "player-joined",
    playerId: user.id,
    username: newParticipant.username,
  });
}

export async function leaveRoom(roomId: string) {
  const user = await requirePlayer();
  if (!user) return { ok: false, error: "Non authentifié" } as const;

  const room = await prisma.battleFeatRoom.findUnique({ where: { id: roomId } });
  if (!room) return { ok: false, error: "Room introuvable" } as const;
  if (room.status !== "waiting") return { ok: false, error: "Partie commencée" } as const;
  if (room.hostId === user.id) return { ok: false, error: "L'hôte ne peut pas quitter" } as const;

  const participants = normalizeBattleFeatParticipants(room.participants);
  const updated = participants
    .filter((p) => p.playerId !== user.id)
    .map((p, i) => ({ ...p, position: i }));
  await prisma.battleFeatRoom.update({
    where: { id: roomId },
    data: { participants: updated as unknown as Prisma.JsonArray },
  });
  return buildRoomResponse(roomId, { type: "player-left", playerId: user.id });
}

export async function startGame(
  roomId: string,
  startingCharacterId: string,
  startingCharacterName: string,
  startingCharacterPic: string | null,
) {
  const user = await requirePlayer();
  if (!user) return { ok: false, error: "Non authentifié" } as const;

  const room = await prisma.battleFeatRoom.findUnique({ where: { id: roomId } });
  if (!room) return { ok: false, error: "Room introuvable" } as const;
  if (room.hostId !== user.id) return { ok: false, error: "Seul l'hôte peut lancer la partie" } as const;

  const participants = normalizeBattleFeatParticipants(room.participants);
  if (participants.length < 2) return { ok: false, error: "Au moins 2 joueurs requis" } as const;

  const nowIso = new Date().toISOString();
  const reset = participants.map((p, i) => ({
    ...p,
    score: 0,
    jokers: 1,
    eliminated: false,
    position: i,
    lastSeenAt: nowIso,
  }));

  const firstTurnId =
    reset.find((p) => p.playerId !== room.hostId)?.playerId ?? reset[0].playerId;

  await prisma.battleFeatRoom.update({
    where: { id: roomId },
    data: {
      status: "playing",
      winnerId: null,
      startingArtistId: startingCharacterId,
      startingArtistName: startingCharacterName,
      startingArtistPic: startingCharacterPic,
      currentArtistId: startingCharacterId,
      currentArtistName: startingCharacterName,
      currentArtistPic: startingCharacterPic,
      currentTurnId: firstTurnId,
      usedArtistIds: [startingCharacterId],
      moves: [],
      participants: reset as unknown as Prisma.JsonArray,
    },
  });

  return buildRoomResponse(roomId, {
    type: "game-start",
    startingArtistId: startingCharacterId,
    startingArtistName: startingCharacterName,
    startingArtistPic: startingCharacterPic,
    firstTurnId,
  });
}

export async function submitMove(roomId: string, character: MoveCharacterInput) {
  const user = await requirePlayer();
  if (!user) return { ok: false, valid: false, error: "Non authentifié" } as const;

  const room = await prisma.battleFeatRoom.findUnique({ where: { id: roomId } });
  if (!room) return { ok: false, valid: false, error: "Room introuvable" } as const;
  if (room.status !== "playing") return { ok: false, valid: false, error: "Partie non en cours" } as const;
  if (room.currentTurnId !== user.id) return { ok: false, valid: false, error: "Pas ton tour" } as const;
  if (!room.currentArtistId) {
    return { ok: false, valid: false, error: "Pas de personnage courant" } as const;
  }

  const usedArtistIds = normalizeUsedArtistIds(room.usedArtistIds);
  if (usedArtistIds.includes(character.id)) {
    const outcome = await eliminateAndAdvance(roomId, room, user.id);
    const response = await buildRoomResponse(roomId, {
      type: "eliminated",
      loserId: user.id,
      winnerId: outcome.winnerId,
    });
    if (!response.ok) return { ok: false, valid: false, error: response.error } as const;
    return {
      ok: true,
      valid: false,
      error: "Personnage déjà utilisé !",
      room: response.room,
      event: response.event,
    } as const;
  }

  const coAppearance = await validateCoAppearance(room.currentArtistId, character.id);

  if (!coAppearance) {
    const outcome = await eliminateAndAdvance(roomId, room, user.id);
    const response = await buildRoomResponse(roomId, {
      type: "eliminated",
      loserId: user.id,
      winnerId: outcome.winnerId,
    });
    if (!response.ok) return { ok: false, valid: false, error: response.error } as const;
    return {
      ok: true,
      valid: false,
      error: "Pas de co-apparition valide !",
      room: response.room,
      event: response.event,
    } as const;
  }

  const moveResult = await applyMoveToRoom(
    roomId,
    user.id,
    room,
    character,
    coAppearance.animeTitle ?? null,
  );

  const response = await buildRoomResponse(roomId, {
    type: "move",
    artistId: character.id,
    artistName: character.name,
    artistPic: character.pictureUrl,
    trackTitle: moveResult.trackTitle,
    nextTurnId: moveResult.nextTurnId ?? "",
    usedIds: moveResult.usedArtistIds,
  });
  if (!response.ok) return { ok: false, valid: false, error: response.error } as const;
  return {
    ok: true,
    valid: true,
    trackTitle: moveResult.trackTitle,
    previewUrl: null,
    room: response.room,
    event: response.event,
  } as const;
}

export async function useJoker(roomId: string) {
  const user = await requirePlayer();
  if (!user) return { ok: false, error: "Non authentifié" } as const;

  const room = await prisma.battleFeatRoom.findUnique({ where: { id: roomId } });
  if (!room) return { ok: false, error: "Room introuvable" } as const;
  if (room.status !== "playing") return { ok: false, error: "Partie non en cours" } as const;
  if (room.currentTurnId !== user.id) return { ok: false, error: "Pas ton tour" } as const;
  if (!room.currentArtistId) return { ok: false, error: "Pas de personnage courant" } as const;

  const participants = normalizeBattleFeatParticipants(room.participants);
  const me = findBattleFeatParticipant(participants, user.id);
  if (!me || me.jokers < 1) return { ok: false, error: "Plus de joker" } as const;

  const jokerChar = await pickJokerMove(
    room.currentArtistId,
    normalizeUsedArtistIds(room.usedArtistIds),
  );
  if (!jokerChar) return { ok: false, error: "Aucun personnage disponible" } as const;

  const moveResult = await applyMoveToRoom(
    roomId,
    user.id,
    room,
    { id: jokerChar.id, name: jokerChar.name, pictureUrl: jokerChar.pictureUrl },
    jokerChar.animeTitle ?? null,
    { decrementJoker: true },
  );

  const response = await buildRoomResponse(roomId, {
    type: "joker-used",
    playerId: user.id,
    artistId: jokerChar.id,
    artistName: jokerChar.name,
    artistPic: jokerChar.pictureUrl,
  });
  if (!response.ok) return { ok: false, error: response.error } as const;
  return {
    ok: true,
    room: response.room,
    event: response.event,
    jokerCharacter: jokerChar,
    trackTitle: moveResult.trackTitle,
  } as const;
}

export async function rematch(roomId: string) {
  const user = await requirePlayer();
  if (!user) return { ok: false, error: "Non authentifié" } as const;

  const room = await prisma.battleFeatRoom.findUnique({ where: { id: roomId } });
  if (!room) return { ok: false, error: "Room introuvable" } as const;
  const participants = normalizeBattleFeatParticipants(room.participants);
  if (!findBattleFeatParticipant(participants, user.id)) {
    return { ok: false, error: "Tu n'es pas dans cette room" } as const;
  }

  const nowIso = new Date().toISOString();
  const reset = participants.map((p, i) => ({
    ...p,
    score: 0,
    jokers: 1,
    eliminated: false,
    position: i,
    lastSeenAt: nowIso,
  }));

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
      winnerId: null,
      participants: reset as unknown as Prisma.JsonArray,
    },
  });

  return buildRoomResponse(roomId, { type: "rematch" });
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

  const outcome = await eliminateAndAdvance(roomId, room, user.id);
  const response = await buildRoomResponse(roomId, {
    type: "eliminated",
    loserId: user.id,
    winnerId: outcome.winnerId,
  });
  if (!response.ok) return response;

  return {
    ok: true,
    room: response.room,
    event: response.event,
    winnerId: response.room.winnerId,
    loserId: user.id,
  } as const;
}
