import prisma from "@/lib/prisma";
import {
  cacheCoAppearances as cacheCoAppearancesImpl,
  findCachedCoappearance as findCachedCoappearanceImpl,
  getCachedCoAppearances as getCachedCoAppearancesImpl,
  resolveCoAppearances as resolveCoAppearancesImpl,
  MIN_CACHED_NEIGHBORS,
} from "@klash/relation-graph";
import type { ConnectedCharacter } from "@klash/content-adapter";

export { MIN_CACHED_NEIGHBORS };

export async function getCachedCoAppearances(sourceExternalId: string) {
  return getCachedCoAppearancesImpl(prisma, sourceExternalId);
}

export async function cacheCoAppearances(
  sourceExternalId: string,
  sourceName: string,
  sourceFavourites: number,
  sourcePictureUrl: string | null,
  neighbors: ConnectedCharacter[],
) {
  return cacheCoAppearancesImpl(
    prisma,
    sourceExternalId,
    sourceName,
    sourceFavourites,
    sourcePictureUrl,
    neighbors,
  );
}

export async function findCachedCoappearance(charAExternalId: string, charBExternalId: string) {
  return findCachedCoappearanceImpl(prisma, charAExternalId, charBExternalId);
}

export async function resolveCoAppearances(
  sourceExternalId: string,
  sourceName: string,
  sourceFavourites: number,
  sourcePictureUrl: string | null,
  fetchLive: () => Promise<ConnectedCharacter[]>,
) {
  return resolveCoAppearancesImpl(
    prisma,
    sourceExternalId,
    sourceName,
    sourceFavourites,
    sourcePictureUrl,
    fetchLive,
  );
}
