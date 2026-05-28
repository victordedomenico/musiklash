import {
  fetchCharacterCoAppearances,
  getCharacterById as getAniListCharacterById,
  validateCharacterCoAppearance,
  type ConnectedCharacter,
} from "@klash/content-adapter";
import type { ContentEntity } from "@klash/content-adapter";
import type { RelationGraph } from "@klash/klash-config";
import type { PrismaClient } from "@prisma/client";
import {
  cacheCoAppearances,
  findCachedCoappearance,
  getCachedCoAppearances,
  resolveCoAppearances,
} from "./anilist-cache";

function toContentEntity(c: ConnectedCharacter): ContentEntity {
  return {
    id: c.id,
    name: c.name,
    pictureUrl: c.pictureUrl ?? undefined,
    fanCount: c.favourites,
    source: "anilist",
    metadata: c.animeTitle ? { animeTitle: c.animeTitle } : undefined,
  };
}

/** AniList character co-appearances with optional Postgres cache. */
export function createAnilistRelationGraph(prisma: PrismaClient): RelationGraph {
  async function getSourceCharacterMeta(characterId: string) {
    const cached = await prisma.animeCharacter.findUnique({
      where: { externalId: characterId },
      select: { name: true, favourites: true, pictureUrl: true },
    });
    if (cached) {
      return {
        name: cached.name,
        favourites: cached.favourites,
        pictureUrl: cached.pictureUrl,
      };
    }
    const live = await getAniListCharacterById(parseInt(characterId, 10));
    if (!live) return null;
    return {
      name: live.name.full,
      favourites: live.favourites,
      pictureUrl: live.image.medium ?? live.image.large ?? null,
    };
  }

  return {
    source: "anilist",

    async getRelatedEntities(entityId: string): Promise<ContentEntity[]> {
      const meta = await getSourceCharacterMeta(entityId);
      if (!meta) {
        const live = await fetchCharacterCoAppearances(entityId);
        return live.map(toContentEntity);
      }

      const resolved = await resolveCoAppearances(
        prisma,
        entityId,
        meta.name,
        meta.favourites,
        meta.pictureUrl,
        () => fetchCharacterCoAppearances(entityId),
      );
      return resolved.map(toContentEntity);
    },

    async validateLink(fromEntityId: string, toEntityId: string) {
      const cached = await findCachedCoappearance(prisma, fromEntityId, toEntityId);
      if (cached) {
        return { valid: true, viaItemId: cached.animeTitle };
      }

      const result = await validateCharacterCoAppearance(fromEntityId, toEntityId);
      if (!result) return { valid: false };

      const [aMeta, bMeta] = await Promise.all([
        getSourceCharacterMeta(fromEntityId),
        getSourceCharacterMeta(toEntityId),
      ]);
      if (aMeta && bMeta) {
        await cacheCoAppearances(prisma, fromEntityId, aMeta.name, aMeta.favourites, aMeta.pictureUrl, [
          {
            id: toEntityId,
            name: bMeta.name,
            pictureUrl: bMeta.pictureUrl,
            favourites: bMeta.favourites,
            animeTitle: result.animeTitle,
          },
        ]);
        await cacheCoAppearances(prisma, toEntityId, bMeta.name, bMeta.favourites, bMeta.pictureUrl, [
          {
            id: fromEntityId,
            name: aMeta.name,
            pictureUrl: aMeta.pictureUrl,
            favourites: aMeta.favourites,
            animeTitle: result.animeTitle,
          },
        ]);
      }

      return { valid: true, viaItemId: result.animeTitle };
    },

    async getOptions(fromEntityId: string, options?: { limit?: number }) {
      const related = await this.getRelatedEntities(fromEntityId);
      const limit = options?.limit ?? related.length;
      return related.slice(0, limit);
    },
  };
}

export {
  cacheCoAppearances,
  findCachedCoappearance,
  getCachedCoAppearances,
  resolveCoAppearances,
  MIN_CACHED_NEIGHBORS,
} from "./anilist-cache";
