import prisma from "@/lib/prisma";
import {
  toStatsSnapshot,
  type SmashPassChoice,
  type SmashPassItemStatsSnapshot,
  type SmashPassItemType,
} from "@/lib/smash-pass";

export async function recordGlobalVote(
  itemType: SmashPassItemType,
  deezerId: number,
  choice: SmashPassChoice,
): Promise<SmashPassItemStatsSnapshot> {
  const id = BigInt(deezerId);
  const smashDelta = choice === "smash" ? BigInt(1) : BigInt(0);
  const passDelta = choice === "pass" ? BigInt(1) : BigInt(0);

  const row = await prisma.smashPassItemStats.upsert({
    where: {
      itemType_deezerId: { itemType, deezerId: id },
    },
    create: {
      itemType,
      deezerId: id,
      smashCount: smashDelta,
      passCount: passDelta,
    },
    update: {
      smashCount: { increment: smashDelta },
      passCount: { increment: passDelta },
    },
  });

  return toStatsSnapshot(
    itemType,
    deezerId,
    Number(row.smashCount),
    Number(row.passCount),
  );
}

export async function getGlobalStats(
  itemType: SmashPassItemType,
  deezerId: number,
): Promise<SmashPassItemStatsSnapshot> {
  const row = await prisma.smashPassItemStats.findUnique({
    where: {
      itemType_deezerId: { itemType, deezerId: BigInt(deezerId) },
    },
  });

  if (!row) {
    return toStatsSnapshot(itemType, deezerId, 0, 0);
  }

  return toStatsSnapshot(
    itemType,
    deezerId,
    Number(row.smashCount),
    Number(row.passCount),
  );
}

export async function getGlobalStatsBatch(
  itemType: SmashPassItemType,
  deezerIds: number[],
): Promise<Map<number, SmashPassItemStatsSnapshot>> {
  if (deezerIds.length === 0) return new Map();

  const rows = await prisma.smashPassItemStats.findMany({
    where: {
      itemType,
      deezerId: { in: deezerIds.map((id) => BigInt(id)) },
    },
  });

  const map = new Map<number, SmashPassItemStatsSnapshot>();
  for (const id of deezerIds) {
    map.set(id, toStatsSnapshot(itemType, id, 0, 0));
  }
  for (const row of rows) {
    const id = Number(row.deezerId);
    map.set(
      id,
      toStatsSnapshot(itemType, id, Number(row.smashCount), Number(row.passCount)),
    );
  }
  return map;
}
