import type { ContentCollection, ContentEntity, ContentItem, ContentSource } from "./types";
import {
  getAnimeById,
  getAnimeCharacters,
  getCharacterById,
  getTrendingCharacters,
  searchAnime,
  searchCharacters,
  type AniListCharacter,
  type AniListMedia,
} from "./anilist";
import { searchJikanCharacters, jikanCharToContentItem } from "./jikan";
import { searchSuperheroes, superheroToItem, totalPower } from "./superhero";

function animeTitle(m: AniListMedia): string {
  return m.title.english ?? m.title.romaji ?? m.title.native ?? String(m.id);
}

function characterToItem(c: AniListCharacter): ContentItem {
  const seriesTitle = c.media?.nodes[0]?.title?.romaji;
  return {
    id: `char-${c.id}`,
    title: c.name.full,
    subtitle: seriesTitle,
    coverUrl: c.image.large ?? c.image.medium ?? undefined,
    source: "anilist",
    metadata: {
      anilistCharacterId: c.id,
      type: "character",
      favourites: c.favourites,
      nativeName: c.name.native,
      powerScaling: true,
    },
  };
}

function mediaToEntity(m: AniListMedia): ContentEntity {
  return {
    id: String(m.id),
    name: animeTitle(m),
    pictureUrl: m.coverImage.large ?? m.coverImage.medium ?? undefined,
    fanCount: m.popularity,
    source: "anilist",
    metadata: { type: "anime" },
  };
}

function mediaToCollection(m: AniListMedia): ContentCollection {
  return {
    id: String(m.id),
    title: animeTitle(m),
    coverUrl: m.coverImage.large ?? m.coverImage.medium ?? undefined,
    source: "anilist",
    metadata: {
      popularity: m.popularity,
      seasonYear: m.seasonYear,
      type: "anime",
    },
  };
}

async function charactersFromAnime(animeId: number, limit = 25): Promise<ContentItem[]> {
  const chars = await getAnimeCharacters(animeId, limit);
  return chars.map(characterToItem);
}

/** Power scaling MVP — personnages AniList en priorité, séries anime pour parcourir un roster. */
export const powerklashContentSource: ContentSource = {
  source: "powerklash",

  async searchItems(query, { limit = 20 } = {}) {
    const chars = await searchCharacters(query, limit);
    return chars.map(characterToItem);
  },

  async searchCollections(query, { limit = 20 } = {}) {
    const animes = await searchAnime(query, limit);
    return animes.map(mediaToCollection);
  },

  async searchEntities(query, { limit = 20 } = {}) {
    const animes = await searchAnime(query, limit);
    return animes.map(mediaToEntity);
  },

  async getCollectionItems(collectionId) {
    const animeId = Number(collectionId);
    if (isNaN(animeId)) return [];
    return charactersFromAnime(animeId);
  },

  async getEntityTopItems(entityId, { limit = 20 } = {}) {
    const animeId = Number(entityId);
    if (isNaN(animeId)) return [];
    return charactersFromAnime(animeId, limit);
  },

  async getEntityById(entityId) {
    if (entityId.startsWith("char-")) {
      const charId = Number(entityId.replace("char-", ""));
      const char = await getCharacterById(charId);
      if (!char) return null;
      return {
        id: entityId,
        name: char.name.full,
        pictureUrl: char.image.large ?? char.image.medium ?? undefined,
        fanCount: char.favourites,
        source: "anilist",
        metadata: { type: "character" },
      };
    }
    const anime = await getAnimeById(Number(entityId));
    return anime ? mediaToEntity(anime) : null;
  },

  async getEntityCollections(entityId, { limit = 100 } = {}) {
    const animeId = Number(entityId);
    if (isNaN(animeId)) return [];
    const anime = await getAnimeById(animeId);
    if (!anime) return [];
    return [mediaToCollection(anime)].slice(0, limit);
  },

  async searchItemsByKind(kind, query, { limit = 20 } = {}) {
    switch (kind) {
      case "character": {
        const chars = await searchCharacters(query, limit);
        return chars.map(characterToItem);
      }
      case "transformation": {
        const chars = await searchJikanCharacters(query, limit);
        return chars.map((c) => jikanCharToContentItem(c, "transformation"));
      }
      case "power":
      case "technique": {
        const chars = await searchJikanCharacters(query, limit);
        return chars.map((c) => jikanCharToContentItem(c, "power"));
      }
      case "hero":
      case "superhero": {
        const heroes = await searchSuperheroes(query, limit);
        // Sort by total power — power scaling relevance
        return heroes
          .sort((a, b) => totalPower(b.powerstats) - totalPower(a.powerstats))
          .map(superheroToItem);
      }
      case "anime": {
        const animes = await searchAnime(query, limit);
        return animes.map((m) => ({
          id: String(m.id),
          title: animeTitle(m),
          subtitle: m.genres.slice(0, 2).join(", ") || undefined,
          coverUrl: m.coverImage.large ?? m.coverImage.medium ?? undefined,
          source: "anilist" as const,
          metadata: { type: "anime", popularity: m.popularity },
        }));
      }
      default:
        return this.searchItems(query, { limit });
    }
  },
};

export async function getTrendingPowerCharacters(limit = 18): Promise<ContentItem[]> {
  try {
    const chars = await getTrendingCharacters(limit);
    return chars.map(characterToItem);
  } catch (err) {
    console.error("[powerklash] trending characters", err);
    return [];
  }
}
