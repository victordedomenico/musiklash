import type {
  ContentCollection,
  ContentEntity,
  ContentItem,
  ContentSource,
} from "./types";

const RAWG_BASE = "https://api.rawg.io/api";

// ─── Raw RAWG types (subset) ──────────────────────────────────────────────────

export type RawgGame = {
  id: number;
  name: string;
  background_image: string | null;
  released?: string;
  rating?: number;
  ratings_count?: number;
  metacritic?: number | null;
  genres?: { id: number; name: string; slug: string }[];
  developers?: { id: number; name: string; slug: string }[];
  parent_platforms?: { platform: { id: number; name: string; slug: string } }[];
};

export type RawgDeveloper = {
  id: number;
  name: string;
  image_background: string | null;
  games_count?: number;
};

export type RawgGenre = {
  id: number;
  name: string;
  slug: string;
  games_count?: number;
  image_background?: string | null;
};

export type RawgGameSeries = {
  id: number;
  name: string;
  slug: string;
  games_count?: number;
};

type RawgPaged<T> = { results?: T[]; count?: number };

// ─── Fetch ────────────────────────────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.RAWG_API_KEY?.trim();
  if (!key) {
    throw new Error("RAWG_API_KEY is not configured");
  }
  return key;
}

function yearFromDate(date?: string): string | undefined {
  return date?.slice(0, 4) || undefined;
}

function platformSubtitle(game: RawgGame): string | undefined {
  const year = yearFromDate(game.released);
  const platforms = game.parent_platforms
    ?.map((p) => p.platform.name)
    .slice(0, 2)
    .join(", ");
  if (year && platforms) return `${year} · ${platforms}`;
  return year ?? platforms;
}

async function rawgGet<T>(
  path: string,
  params: Record<string, string> = {},
  options?: { live?: boolean },
): Promise<T> {
  const url = new URL(`${RAWG_BASE}${path}`);
  url.searchParams.set("key", getApiKey());
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    ...(options?.live ? { cache: "no-store" as const } : {}),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(options?.live ? {} : ({ next: { revalidate: 3600 } } as any)),
  });

  if (!res.ok) {
    throw new Error(`RAWG ${path} → ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Raw API (for routes / home trending) ─────────────────────────────────────

export async function searchGames(query: string, limit = 20): Promise<RawgGame[]> {
  if (!query.trim()) return [];
  const json = await rawgGet<RawgPaged<RawgGame>>("/games", {
    search: query.trim(),
    page_size: String(Math.min(limit, 40)),
    page: "1",
  });
  return (json.results ?? []).slice(0, limit);
}

export async function searchDevelopers(
  query: string,
  limit = 20,
): Promise<RawgDeveloper[]> {
  if (!query.trim()) return [];
  const json = await rawgGet<RawgPaged<RawgDeveloper>>("/developers", {
    search: query.trim(),
    page_size: String(Math.min(limit, 40)),
    page: "1",
  });
  return (json.results ?? []).slice(0, limit);
}

export async function searchGenres(query: string, limit = 20): Promise<RawgGenre[]> {
  if (!query.trim()) return [];
  const json = await rawgGet<RawgPaged<RawgGenre>>("/genres", {
    search: query.trim(),
    page_size: String(Math.min(limit, 40)),
    page: "1",
  });
  return (json.results ?? []).slice(0, limit);
}

export async function searchGameSeries(
  _query: string,
  _limit = 20,
): Promise<RawgGameSeries[]> {
  // RAWG has no standalone /game-series search endpoint; /games/{id}/game-series
  // only works for a specific game. Return empty rather than 404.
  return [];
}

export async function getGameById(gameId: string | number): Promise<RawgGame | null> {
  try {
    return await rawgGet<RawgGame>(`/games/${gameId}`);
  } catch {
    return null;
  }
}

export async function getDeveloperById(
  developerId: string | number,
): Promise<RawgDeveloper | null> {
  try {
    return await rawgGet<RawgDeveloper>(`/developers/${developerId}`);
  } catch {
    return null;
  }
}

export async function getDeveloperGames(
  developerId: string | number,
  limit = 50,
): Promise<RawgGame[]> {
  const json = await rawgGet<RawgPaged<RawgGame>>("/games", {
    developers: String(developerId),
    ordering: "-rating",
    page_size: String(Math.min(limit, 40)),
    page: "1",
  });
  return (json.results ?? []).slice(0, limit);
}

export async function getGenreGames(
  genreId: string | number,
  limit = 50,
): Promise<RawgGame[]> {
  const json = await rawgGet<RawgPaged<RawgGame>>("/games", {
    genres: String(genreId),
    ordering: "-rating",
    page_size: String(Math.min(limit, 40)),
    page: "1",
  });
  return (json.results ?? []).slice(0, limit);
}

export async function getGameSeriesGames(
  gameId: string | number,
  limit = 50,
): Promise<RawgGame[]> {
  try {
    const json = await rawgGet<RawgPaged<RawgGame>>(`/games/${gameId}/game-series`, {
      page_size: String(Math.min(limit, 40)),
      page: "1",
    });
    return (json.results ?? []).slice(0, limit);
  } catch {
    return [];
  }
}

export async function getTrendingGames(limit = 18): Promise<RawgGame[]> {
  const json = await rawgGet<RawgPaged<RawgGame>>("/games", {
    ordering: "-added",
    page_size: String(Math.min(limit, 40)),
    page: "1",
    metacritic: "80,100",
  });
  return (json.results ?? []).slice(0, limit);
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function gameToItem(g: RawgGame): ContentItem {
  return {
    id: String(g.id),
    title: g.name,
    subtitle: platformSubtitle(g),
    coverUrl: g.background_image ?? undefined,
    source: "rawg",
    metadata: {
      itemKind: "game",
      released: g.released,
      rating: g.rating,
      metacritic: g.metacritic,
      genres: g.genres?.map((x) => x.name),
    },
  };
}

function seriesToCollection(s: RawgGameSeries): ContentCollection {
  return {
    id: String(s.id),
    title: s.name,
    source: "rawg",
    metadata: { gamesCount: s.games_count, collectionKind: "series" },
  };
}

/** Extracts the franchise name from a game title.
 *  "Mario Kart 8 Deluxe" → "Mario Kart"
 *  "FIFA 23" → "FIFA"
 *  "The Witcher 3: Wild Hunt" → "The Witcher"
 *  "Mario Kart DS" → "Mario Kart"
 */
function extractFranchiseName(name: string): string {
  const steps: RegExp[] = [
    /\s*:.*$/,                                           // ": subtitle"
    /\s+v\d+(\.\d+)*$/i,                                // version suffix "V1.0"
    /\s+(hd|4k|vr|remastered|remake|deluxe|complete|ultimate|anniversary|collection|classic|origins|legends|goty|game\s+of\s+the\s+year|director'?s?\s+cut|enhanced)\b.*/i,
    /\s+(live|home\s+circuit|battle\s+royale)\b.*/i,    // known subtitles
    /\s+(ds|wii\s?u?|3ds|switch|n64|64|gba|gc|gamecube|ps\d?|xbox\s?\w*)\s*$/i,  // platforms
    /\s+[ivxlcdm]{1,6}$/i,                              // Roman numerals
    /\s+\d+(\.\d+)?\s*$/,                               // trailing numbers
  ];
  let result = name;
  for (const re of steps) {
    const next = result.replace(re, "").trim();
    if (next) result = next;
  }
  return result || name;
}

function developerToEntity(d: RawgDeveloper): ContentEntity {
  return {
    id: String(d.id),
    name: d.name,
    pictureUrl: d.image_background ?? undefined,
    fanCount: d.games_count,
    source: "rawg",
    metadata: { entityKind: "developer" },
  };
}

function genreToEntity(g: RawgGenre): ContentEntity {
  return {
    id: `genre-${g.id}`,
    name: g.name,
    pictureUrl: g.image_background ?? undefined,
    fanCount: g.games_count,
    source: "rawg",
    metadata: { entityKind: "genre", genreId: g.id, slug: g.slug },
  };
}

function genreToCollection(g: RawgGenre): ContentCollection {
  return {
    id: `genre-${g.id}`,
    title: g.name,
    coverUrl: g.image_background ?? undefined,
    source: "rawg",
    metadata: { collectionKind: "genre", genreId: g.id },
  };
}

// ─── ContentSource ────────────────────────────────────────────────────────────

export const rawgContentSource: ContentSource = {
  source: "rawg",

  async searchItems(query, { limit = 20 } = {}) {
    const games = await searchGames(query, limit);
    return games.map(gameToItem);
  },

  async searchItemsByKind(kind, query, { limit = 20 } = {}) {
    if (kind === "game") {
      return this.searchItems(query, { limit });
    }
    if (kind === "genre") {
      const genres = await searchGenres(query, limit);
      return genres.map((g) => ({
        id: `genre-${g.id}`,
        title: g.name,
        coverUrl: g.image_background ?? undefined,
        source: "rawg",
        metadata: { itemKind: "genre", genreId: g.id, gamesCount: g.games_count },
      })) satisfies ContentItem[];
    }
    return this.searchItems(query, { limit });
  },

  async searchCollections(query, { limit = 20 } = {}) {
    // Fetch more results so grouping yields enough unique franchises
    const games = await searchGames(query, Math.min(limit * 3, 40));
    // Deduplicate by franchise name (case-insensitive), keep first/most-relevant game as anchor
    const seen = new Map<string, { name: string; game: RawgGame }>();
    for (const g of games) {
      const franchise = extractFranchiseName(g.name);
      const key = franchise.toLowerCase();
      if (!seen.has(key)) seen.set(key, { name: franchise, game: g });
    }
    return [...seen.values()].slice(0, limit).map(({ name, game }) => ({
      id: `series-${game.id}`,
      title: name,
      coverUrl: game.background_image ?? undefined,
      source: "rawg",
      metadata: { collectionKind: "franchise", gameId: game.id },
    })) satisfies ContentCollection[];
  },

  async searchEntities(query, { limit = 20 } = {}) {
    const [developers, genres] = await Promise.all([
      searchDevelopers(query, Math.ceil(limit / 2)),
      searchGenres(query, Math.ceil(limit / 2)),
    ]);
    return [...developers.map(developerToEntity), ...genres.map(genreToEntity)].slice(
      0,
      limit,
    );
  },

  async getCollectionItems(collectionId) {
    if (collectionId.startsWith("genre-")) {
      const genreId = collectionId.replace(/^genre-/, "");
      const games = await getGenreGames(genreId);
      return games.map(gameToItem);
    }
    const seriesId = collectionId.replace(/^series-/, "");
    const games = await getGameSeriesGames(seriesId);
    return games.map(gameToItem);
  },

  async getEntityTopItems(entityId, { limit = 50 } = {}) {
    if (entityId.startsWith("genre-")) {
      const genreId = entityId.replace(/^genre-/, "");
      const games = await getGenreGames(genreId, limit);
      return games.map(gameToItem);
    }
    const games = await getDeveloperGames(entityId, limit);
    return games.map(gameToItem);
  },

  async getEntityById(entityId) {
    if (entityId.startsWith("genre-")) {
      const genreId = entityId.replace(/^genre-/, "");
      try {
        const genre = await rawgGet<RawgGenre>(`/genres/${genreId}`);
        return genreToEntity(genre);
      } catch {
        return null;
      }
    }
    const developer = await getDeveloperById(entityId);
    return developer ? developerToEntity(developer) : null;
  },

  async getEntityCollections(_entityId, _options) {
    return [];
  },
};
