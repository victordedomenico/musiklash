import prisma from "@/lib/prisma";
import {
  toStatsSnapshot,
  type SmashPassChoice,
  type SmashPassItemStatsSnapshot,
  type SmashPassItemType,
} from "@/lib/smash-pass";

export async function recordGlobalVote(
  itemType: SmashPassItemType,
  externalId: string,
  choice: SmashPassChoice,
): Promise<SmashPassItemStatsSnapshot> {
  const smashDelta = choice === "smash" ? BigInt(1) : BigInt(0);
  const passDelta = choice === "pass" ? BigInt(1) : BigInt(0);

  const row = await prisma.smashPassItemStats.upsert({
    where: {
      itemType_externalId: { itemType, externalId },
    },
    create: {
      itemType,
      externalId,
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
  externalId: string,
): Promise<SmashPassItemStatsSnapshot> {
  const row = await prisma.smashPassItemStats.findUnique({
    where: {
      itemType_externalId: { itemType, externalId },
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
  externalIds: string[],
): Promise<Map<string, SmashPassItemStatsSnapshot>> {
  if (externalIds.length === 0) return new Map();

  const rows = await prisma.smashPassItemStats.findMany({
    where: {
      itemType,
      externalId: { in: externalIds },
    },
  });

  const map = new Map<string, SmashPassItemStatsSnapshot>();
  for (const id of externalIds) {
    map.set(id, toStatsSnapshot(itemType, id, 0, 0));
  }
  for (const row of rows) {
    map.set(
      row.externalId,
      toStatsSnapshot(itemType, row.externalId, Number(row.smashCount), Number(row.passCount)),
    );
  }
  return map;
}
