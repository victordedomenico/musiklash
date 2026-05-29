import type { ContentEntity, ContentItem, ContentSource } from "./types";
import { anilistContentSource, getCharacterById, searchCharacters } from "./anilist";
import type { TmdbPerson } from "./tmdb";
import { getPersonById, searchPeople } from "./tmdb";

const TMDB_IMAGE = "https://image.tmdb.org/t/p/w500";

function personToItem(p: TmdbPerson): ContentItem {
  const knownFor = p.known_for_department;
  return {
    id: `person-${p.id}`,
    title: p.name,
    subtitle: knownFor ? `Cinéma · ${knownFor}` : "Cinéma & séries",
    coverUrl: p.profile_path ? `${TMDB_IMAGE}${p.profile_path}` : undefined,
    source: "tmdb",
    metadata: {
      itemKind: "person",
      tmdbPersonId: p.id,
      knownForDepartment: p.known_for_department,
      popularity: p.popularity,
    },
  };
}

async function animeCharacterItems(query: string, limit: number): Promise<ContentItem[]> {
  if (anilistContentSource.searchItemsByKind) {
    return anilistContentSource.searchItemsByKind("character", query, { limit });
  }
  const chars = await searchCharacters(query, limit);
  return chars.map((c) => ({
    id: `char-${c.id}`,
    title: c.name.full,
    subtitle: c.media?.nodes[0]?.title?.romaji,
    coverUrl: c.image.large ?? c.image.medium ?? undefined,
    source: "anilist" as const,
    metadata: { itemKind: "character", anilistCharacterId: c.id, favourites: c.favourites },
  }));
}

async function filmPersonItems(query: string, limit: number): Promise<ContentItem[]> {
  try {
    const people = await searchPeople(query, limit);
    return people.map(personToItem);
  } catch {
    return [];
  }
}

/**
 * Cross-universe character battles — AniList (anime) + TMDB (cinéma / séries).
 * MVP: two sources via `searchItemsByKind` subtypes in the picker.
 */
export const characterKlashContentSource: ContentSource = {
  source: "characterklash",

  async searchItems(query, { limit = 20 } = {}) {
    const half = Math.ceil(limit / 2);
    const [anime, film] = await Promise.all([
      animeCharacterItems(query, half),
      filmPersonItems(query, Math.floor(limit / 2)),
    ]);
    return [...anime, ...film].slice(0, limit);
  },

  async searchItemsByKind(kind, query, { limit = 20 } = {}) {
    switch (kind) {
      case "character":
      case "anime_character":
        return animeCharacterItems(query, limit);
      case "person":
      case "film_person":
        return filmPersonItems(query, limit);
      default:
        return this.searchItems(query, { limit });
    }
  },

  async searchCollections(query, options) {
    return anilistContentSource.searchCollections(query, options);
  },

  async searchEntities(query, options) {
    const limit = options?.limit ?? 20;
    const half = Math.ceil(limit / 2);
    const [anime, film] = await Promise.all([
      anilistContentSource.searchEntities(query, { limit: half }),
      (async () => {
        try {
          const people = await searchPeople(query, Math.floor(limit / 2));
          return people.map(
            (p): ContentEntity => ({
              id: `person-${p.id}`,
              name: p.name,
              pictureUrl: p.profile_path ? `${TMDB_IMAGE}${p.profile_path}` : undefined,
              fanCount: p.popularity ? Math.round(p.popularity) : undefined,
              source: "tmdb",
              metadata: { knownForDepartment: p.known_for_department },
            }),
          );
        } catch {
          return [];
        }
      })(),
    ]);
    return [...anime, ...film].slice(0, limit);
  },

  getCollectionItems: (...args) => anilistContentSource.getCollectionItems(...args),
  getEntityTopItems: (...args) => anilistContentSource.getEntityTopItems(...args),

  async getEntityById(entityId) {
    if (entityId.startsWith("person-")) {
      const id = entityId.replace("person-", "");
      const person = await getPersonById(id);
      if (!person) return null;
      return {
        id: entityId,
        name: person.name,
        pictureUrl: person.profile_path ? `${TMDB_IMAGE}${person.profile_path}` : undefined,
        fanCount: person.popularity ? Math.round(person.popularity) : undefined,
        source: "tmdb",
        metadata: { knownForDepartment: person.known_for_department },
      };
    }
    return anilistContentSource.getEntityById(entityId);
  },

  getEntityCollections: (...args) => anilistContentSource.getEntityCollections(...args),
};

export { getCharacterById };
