import prisma from "@/lib/prisma";
import {
  toStatsSnapshot,
  type SmashPassChoice,
  type SmashPassItemStatsSnapshot,
  type SmashPassItemType,
} from "@/lib/smash-pass";

export async function recordGlobalVote(
  itemType: SmashPassItemType,
  externalId: number,
  choice: SmashPassChoice,
): Promise<SmashPassItemStatsSnapshot> {
  const id = BigInt(externalId);
  const smashDelta = choice === "smash" ? BigInt(1) : BigInt(0);
  const passDelta = choice === "pass" ? BigInt(1) : BigInt(0);

  const row = await prisma.smashPassItemStats.upsert({
    where: {
      itemType_externalId: { itemType, externalId: id },
    },
    create: {
      itemType,
      externalId: id,
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
    externalId,
    Number(row.smashCount),
    Number(row.passCount),
  );
}

export async function getGlobalStats(
  itemType: SmashPassItemType,
  externalId: number,
): Promise<SmashPassItemStatsSnapshot> {
  const row = await prisma.smashPassItemStats.findUnique({
    where: {
      itemType_externalId: { itemType, externalId: BigInt(externalId) },
    },
  });

  if (!row) {
    return toStatsSnapshot(itemType, externalId, 0, 0);
  }

  return toStatsSnapshot(
    itemType,
    externalId,
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
      externalId: { in: deezerIds.map((id) => BigInt(id)) },
    },
  });

  const map = new Map<number, SmashPassItemStatsSnapshot>();
  for (const id of deezerIds) {
    map.set(id, toStatsSnapshot(itemType, id, 0, 0));
  }
  for (const row of rows) {
    const id = Number(row.externalId);
    map.set(
      id,
      toStatsSnapshot(itemType, id, Number(row.smashCount), Number(row.passCount)),
    );
  }
  return map;
}
