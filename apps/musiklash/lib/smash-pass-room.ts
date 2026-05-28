import prisma from "@/lib/prisma";
import {
  mapPrismaItem,
  normalizeParticipants,
  type SmashPassItemData,
  type SmashPassItemType,
  type SmashPassParticipant,
} from "@/lib/smash-pass";

export type SmashPassRoomSnapshot = {
  id: string;
  smashPassId: string;
  hostId: string;
  hostName: string;
  visibility: "private" | "public";
  status: "waiting" | "playing" | "finished";
  itemType: SmashPassItemType;
  currentPosition: number;
  participants: SmashPassParticipant[];
  winnerId: string | null;
  positionStartedAt: string | null;
  updatedAt: string;
  smashPass: {
    id: string;
    title: string;
    items: SmashPassItemData[];
  };
};

export type SmashPassRoomEvent =
  | { type: "player-joined"; playerId: string; username: string }
  | { type: "player-left"; playerId: string }
  | { type: "game-start" }
  | { type: "vote-submitted"; playerId: string; position: number }
  | { type: "advanced"; currentPosition: number }
  | { type: "game-end"; winnerId: string | null }
  | { type: "rematch" };

export type SmashPassRoomBroadcastPayload = {
  room: SmashPassRoomSnapshot;
  event: SmashPassRoomEvent;
};

type RoomRaw = Awaited<ReturnType<typeof fetchRoomRaw>>;

async function fetchRoomRaw(roomId: string) {
  return prisma.smashPassRoom.findUnique({
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
}

export function toSmashPassRoomSnapshot(room: NonNullable<RoomRaw>): SmashPassRoomSnapshot {
  const itemType = room.smashPass.itemType as SmashPassItemType;
  return {
    id: room.id,
    smashPassId: room.smashPassId,
    hostId: room.hostId,
    hostName: room.host.username,
    visibility: room.visibility === "public" ? "public" : "private",
    status: room.status as "waiting" | "playing" | "finished",
    itemType,
    currentPosition: room.currentPosition,
    participants: normalizeParticipants(room.participants),
    winnerId: room.winnerId,
    positionStartedAt: room.positionStartedAt?.toISOString() ?? null,
    updatedAt: room.updatedAt.toISOString(),
    smashPass: {
      id: room.smashPass.id,
      title: room.smashPass.title,
      items: room.smashPass.items.map(mapPrismaItem),
    },
  };
}

export async function getSmashPassRoomSnapshot(
  roomId: string,
): Promise<SmashPassRoomSnapshot | null> {
  const room = await fetchRoomRaw(roomId);
  if (!room) return null;
  return toSmashPassRoomSnapshot(room);
}

export { normalizeParticipants, findParticipant, allParticipantsVoted } from "@/lib/smash-pass";
