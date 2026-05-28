import type { ContentItem, ContentCollection, ContentEntity, ContentSource } from "./types";

const ANILIST_URL = "https://graphql.anilist.co";
const ANIMETHEMES_URL = "https://api.animethemes.moe";

// ─── AniList raw types ────────────────────────────────────────────────────────

export type AniListMedia = {
  id: number;
  idMal: number | null;
  title: { romaji: string; english: string | null; native: string | null };
  coverImage: { large: string | null; medium: string | null; color: string | null };
  bannerImage: string | null;
  popularity: number;
  averageScore: number | null;
  genres: string[];
  seasonYear: number | null;
  episodes: number | null;
  status: string;
  description: string | null;
};

export type AniListCharacter = {
  id: number;
  name: { full: string; native: string | null };
  image: { large: string | null; medium: string | null };
  favourites: number;
  media?: {
    nodes: Array<{ id: number; title: { romaji: string } }>;
  };
};

export type AnimeThemeEntry = {
  id: number;
  slug: string;
  type: "OP" | "ED";
  sequence: number | null;
  song: { title: string; artists: Array<{ name: string }> };
  animethemeentries: Array<{
    videos: Array<{ filename: string; link: string; audio: string | null }>;
  }>;
};

// ─── GraphQL helpers ──────────────────────────────────────────────────────────

async function anilistQuery<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    next: { revalidate: 3600 },
  } as any);
  if (!res.ok) throw new Error(`AniList query failed: ${res.status}`);
  const json = await res.json() as { data: T; errors?: unknown[] };
  if (json.errors?.length) throw new Error(`AniList GraphQL error: ${JSON.stringify(json.errors[0])}`);
  return json.data;
}

// ─── AniList queries ──────────────────────────────────────────────────────────

const SEARCH_ANIME_QUERY = `
query SearchAnime($search: String, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(search: $search, type: ANIME, sort: [SEARCH_MATCH, POPULARITY_DESC]) {
      id idMal
      title { romaji english native }
      coverImage { large medium color }
      bannerImage popularity averageScore genres
      seasonYear episodes status description
    }
  }
}`;

const SEARCH_CHARACTER_QUERY = `
query SearchCharacter($search: String, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    characters(search: $search, sort: [SEARCH_MATCH, FAVOURITES_DESC]) {
      id
      name { full native }
      image { large medium }
      favourites
      media(sort: [POPULARITY_DESC], perPage: 1) { nodes { id title { romaji } } }
    }
  }
}`;

const GET_ANIME_BY_ID_QUERY = `
query GetAnime($id: Int) {
  Media(id: $id, type: ANIME) {
    id idMal
    title { romaji english native }
    coverImage { large medium color }
    bannerImage popularity averageScore genres
    seasonYear episodes status description
  }
}`;

const GET_CHARACTER_BY_ID_QUERY = `
query GetCharacter($id: Int) {
  Character(id: $id) {
    id
    name { full native }
    image { large medium }
    favourites
    media(sort: [POPULARITY_DESC], perPage: 5) { nodes { id title { romaji } } }
  }
}`;

// ─── AnimeThemes helper ───────────────────────────────────────────────────────

async function getAnimeThemes(malId: number): Promise<AnimeThemeEntry[]> {
  try {
    const res = await fetch(
      `${ANIMETHEMES_URL}/anime?filter[malid]=${malId}&include=animethemes.song.artists,animethemes.animethemeentries.videos`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { next: { revalidate: 3600 } } as any,
    );
    if (!res.ok) return [];
    const json = await res.json() as { anime?: Array<{ animethemes?: AnimeThemeEntry[] }> };
    return json.anime?.[0]?.animethemes ?? [];
  } catch {
    return [];
  }
}

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function animeTitle(m: AniListMedia): string {
  return m.title.english ?? m.title.romaji ?? m.title.native ?? String(m.id);
}

function mediaToItem(m: AniListMedia): ContentItem {
  return {
    id: String(m.id),
    title: animeTitle(m),
    subtitle: m.genres.slice(0, 2).join(", ") || undefined,
    coverUrl: m.coverImage.large ?? m.coverImage.medium ?? undefined,
    source: "anilist",
    metadata: {
      idMal: m.idMal,
      popularity: m.popularity,
      averageScore: m.averageScore,
      seasonYear: m.seasonYear,
      episodes: m.episodes,
      status: m.status,
      bannerImage: m.bannerImage,
    },
  };
}

function characterToItem(c: AniListCharacter): ContentItem {
  const animeTitle = c.media?.nodes[0]?.title?.romaji;
  return {
    id: `char-${c.id}`,
    title: c.name.full,
    subtitle: animeTitle,
    coverUrl: c.image.large ?? c.image.medium ?? undefined,
    source: "anilist",
    metadata: {
      anilistCharacterId: c.id,
      type: "character",
      favourites: c.favourites,
      nativeName: c.name.native,
    },
  };
}

function themeToItem(theme: AnimeThemeEntry, anime: AniListMedia): ContentItem {
  const artist = theme.song.artists.map((a) => a.name).join(", ") || animeTitle(anime);
  const videoEntry = theme.animethemeentries[0];
  const video = videoEntry?.videos[0];
  const label = `${theme.type}${theme.sequence ?? ""}`;
  return {
    id: `theme-${theme.id}`,
    title: theme.song.title,
    subtitle: `${label} — ${animeTitle(anime)} (${artist})`,
    coverUrl: anime.coverImage.large ?? anime.coverImage.medium ?? undefined,
    previewUrl: video?.link ?? undefined,
    source: "animethemes",
    metadata: {
      themeType: theme.type,
      sequence: theme.sequence,
      animeId: anime.id,
      animeTitle: animeTitle(anime),
      artist,
      videoFilename: video?.filename,
    },
  };
}

function mediaToCollection(m: AniListMedia): ContentCollection {
  return {
    id: String(m.id),
    title: animeTitle(m),
    coverUrl: m.coverImage.large ?? m.coverImage.medium ?? undefined,
    source: "anilist",
  };
}

function mediaToEntity(m: AniListMedia): ContentEntity {
  return {
    id: String(m.id),
    name: animeTitle(m),
    pictureUrl: m.coverImage.large ?? m.coverImage.medium ?? undefined,
    fanCount: m.popularity,
    source: "anilist",
  };
}

// ─── Raw API exports ──────────────────────────────────────────────────────────

export async function searchAnime(query: string, limit = 20): Promise<AniListMedia[]> {
  if (!query.trim()) return [];
  const data = await anilistQuery<{ Page: { media: AniListMedia[] } }>(SEARCH_ANIME_QUERY, {
    search: query.trim(),
    page: 1,
    perPage: limit,
  });
  return data.Page.media ?? [];
}

export async function searchCharacters(query: string, limit = 20): Promise<AniListCharacter[]> {
  if (!query.trim()) return [];
  const data = await anilistQuery<{ Page: { characters: AniListCharacter[] } }>(SEARCH_CHARACTER_QUERY, {
    search: query.trim(),
    page: 1,
    perPage: limit,
  });
  return data.Page.characters ?? [];
}

export async function getAnimeById(id: number): Promise<AniListMedia | null> {
  try {
    const data = await anilistQuery<{ Media: AniListMedia }>(GET_ANIME_BY_ID_QUERY, { id });
    return data.Media;
  } catch {
    return null;
  }
}

export async function getCharacterById(id: number): Promise<AniListCharacter | null> {
  try {
    const data = await anilistQuery<{ Character: AniListCharacter }>(GET_CHARACTER_BY_ID_QUERY, { id });
    return data.Character;
  } catch {
    return null;
  }
}

export async function getAnimeThemeItems(animeId: number): Promise<ContentItem[]> {
  const anime = await getAnimeById(animeId);
  if (!anime?.idMal) return [];
  const themes = await getAnimeThemes(anime.idMal);
  return themes.map((t) => themeToItem(t, anime));
}

// ─── ContentSource implementation ────────────────────────────────────────────

export const anilistContentSource: ContentSource = {
  source: "anilist",

  async searchItems(query, { limit = 20 } = {}) {
    // Search both anime and characters, merge results
    const [animes, characters] = await Promise.all([
      searchAnime(query, Math.ceil(limit / 2)),
      searchCharacters(query, Math.floor(limit / 2)),
    ]);
    return [
      ...animes.map(mediaToItem),
      ...characters.map(characterToItem),
    ].slice(0, limit);
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
    // For anime: return its openings/endings via AnimeThemes
    const animeId = Number(collectionId);
    if (!isNaN(animeId)) {
      return getAnimeThemeItems(animeId);
    }
    return [];
  },

  async getEntityTopItems(entityId, { limit = 20 } = {}) {
    // For an anime entity: return its themes + top characters
    const animeId = Number(entityId);
    const anime = await getAnimeById(animeId);
    if (!anime) return [];
    const items: ContentItem[] = [mediaToItem(anime)];
    if (anime.idMal) {
      const themes = await getAnimeThemes(anime.idMal);
      items.push(...themes.slice(0, limit - 1).map((t) => themeToItem(t, anime)));
    }
    return items.slice(0, limit);
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
      };
    }
    const anime = await getAnimeById(Number(entityId));
    return anime ? mediaToEntity(anime) : null;
  },
};
