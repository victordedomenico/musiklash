import prisma from "@/lib/prisma";
import { popularityTier, slugifyName } from "@/lib/battle-feat";
import type { ConnectedCharacter } from "@klash/content-adapter";

const MIN_CACHED_NEIGHBORS = 5;

async function upsertCharacter(c: {
  externalId: string;
  name: string;
  favourites: number;
  pictureUrl: string | null;
}) {
  return prisma.animeCharacter.upsert({
    where: { externalId: c.externalId },
    create: {
      externalId: c.externalId,
      name: c.name,
      nameSlug: slugifyName(c.name),
      favourites: c.favourites,
      popularityTier: popularityTier(c.favourites),
      pictureUrl: c.pictureUrl,
    },
    update: {
      name: c.name,
      nameSlug: slugifyName(c.name),
      favourites: c.favourites,
      popularityTier: popularityTier(c.favourites),
      pictureUrl: c.pictureUrl,
    },
  });
}

export async function getCachedCoAppearances(
  sourceExternalId: string,
): Promise<ConnectedCharacter[]> {
  const source = await prisma.animeCharacter.findUnique({
    where: { externalId: sourceExternalId },
    select: { id: true },
  });
  if (!source) return [];

  const links = await prisma.characterCoappearance.findMany({
    where: { characterAId: source.id },
    include: {
      characterB: {
        select: {
          externalId: true,
          name: true,
          favourites: true,
          pictureUrl: true,
        },
      },
    },
    take: 80,
  });

  return links.map((link) => ({
    id: link.characterB.externalId,
    name: link.characterB.name,
    pictureUrl: link.characterB.pictureUrl,
    favourites: link.characterB.favourites,
    animeTitle: link.animeTitle,
  }));
}

export async function cacheCoAppearances(
  sourceExternalId: string,
  sourceName: string,
  sourceFavourites: number,
  sourcePictureUrl: string | null,
  neighbors: ConnectedCharacter[],
) {
  const source = await upsertCharacter({
    externalId: sourceExternalId,
    name: sourceName,
    favourites: sourceFavourites,
    pictureUrl: sourcePictureUrl,
  });

  for (const n of neighbors) {
    const target = await upsertCharacter({
      externalId: n.id,
      name: n.name,
      favourites: n.favourites,
      pictureUrl: n.pictureUrl,
    });

    await prisma.characterCoappearance.upsert({
      where: {
        characterAId_characterBId_animeExternalId: {
          characterAId: source.id,
          characterBId: target.id,
          animeExternalId: n.animeTitle ?? "",
        },
      },
      create: {
        characterAId: source.id,
        characterBId: target.id,
        animeExternalId: n.animeTitle ?? "",
        animeTitle: n.animeTitle,
      },
      update: { animeTitle: n.animeTitle },
    });
  }
}

export async function findCachedCoappearance(
  charAExternalId: string,
  charBExternalId: string,
): Promise<{ animeTitle: string } | null> {
  const [a, b] = await Promise.all([
    prisma.animeCharacter.findUnique({ where: { externalId: charAExternalId } }),
    prisma.animeCharacter.findUnique({ where: { externalId: charBExternalId } }),
  ]);
  if (!a || !b) return null;

  const link = await prisma.characterCoappearance.findFirst({
    where: {
      OR: [
        { characterAId: a.id, characterBId: b.id },
        { characterAId: b.id, characterBId: a.id },
      ],
    },
    select: { animeTitle: true },
  });

  if (!link?.animeTitle) return null;
  return { animeTitle: link.animeTitle };
}

export async function resolveCoAppearances(
  sourceExternalId: string,
  sourceName: string,
  sourceFavourites: number,
  sourcePictureUrl: string | null,
  fetchLive: () => Promise<ConnectedCharacter[]>,
): Promise<ConnectedCharacter[]> {
  const cached = await getCachedCoAppearances(sourceExternalId);
  if (cached.length >= MIN_CACHED_NEIGHBORS) return cached;

  const live = await fetchLive();
  if (live.length > 0) {
    await cacheCoAppearances(
      sourceExternalId,
      sourceName,
      sourceFavourites,
      sourcePictureUrl,
      live,
    );
  }
  return live.length > 0 ? live : cached;
}

export { MIN_CACHED_NEIGHBORS };
