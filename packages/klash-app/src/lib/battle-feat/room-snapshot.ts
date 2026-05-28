import type { PrismaClient } from "@prisma/client";
import type { BattleFeatRoomSnapshot } from "./types";
import {
  normalizeBattleFeatParticipants,
  normalizeMoves,
  normalizeUsedArtistIds,
} from "./shared";

export async function getBattleFeatRoomSnapshot(
  prisma: PrismaClient,
  roomId: string,
): Promise<BattleFeatRoomSnapshot | null> {
  const room = await prisma.battleFeatRoom.findUnique({
    where: { id: roomId },
    include: { host: { select: { username: true } } },
  });

  if (!room) return null;

  return {
    id: room.id,
    hostId: room.hostId,
    hostUsername: room.host.username,
    status: room.status,
    startingArtistId: room.startingArtistId,
    startingArtistName: room.startingArtistName,
    startingArtistPic: room.startingArtistPic,
    currentArtistId: room.currentArtistId,
    currentArtistName: room.currentArtistName,
    currentArtistPic: room.currentArtistPic,
    currentTurnId: room.currentTurnId,
    usedArtistIds: normalizeUsedArtistIds(room.usedArtistIds),
    moves: normalizeMoves(room.moves),
    participants: normalizeBattleFeatParticipants(room.participants),
    winnerId: room.winnerId,
    updatedAt: room.updatedAt.toISOString(),
  };
}
