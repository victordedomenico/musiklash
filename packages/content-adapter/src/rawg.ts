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
  query: string,
  limit = 20,
): Promise<RawgGameSeries[]> {
  if (!query.trim()) return [];
  const json = await rawgGet<RawgPaged<RawgGameSeries>>("/game-series", {
    search: query.trim(),
    page_size: String(Math.min(limit, 40)),
    page: "1",
  });
  return (json.results ?? []).slice(0, limit);
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
  seriesId: string | number,
  limit = 50,
): Promise<RawgGame[]> {
  const json = await rawgGet<RawgPaged<RawgGame>>("/games", {
    game_series: String(seriesId),
    ordering: "-released",
    page_size: String(Math.min(limit, 40)),
    page: "1",
  });
  return (json.results ?? []).slice(0, limit);
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
    if (kind === "series") {
      const series = await searchGameSeries(query, limit);
      return series.map((s) => ({
        id: `series-${s.id}`,
        title: s.name,
        subtitle: "Série / franchise",
        source: "rawg",
        metadata: { itemKind: "series", seriesId: s.id, gamesCount: s.games_count },
      }));
    }
    return this.searchItems(query, { limit });
  },

  async searchCollections(query, { limit = 20 } = {}) {
    const [series, genres] = await Promise.all([
      searchGameSeries(query, limit),
      searchGenres(query, limit),
    ]);
    const seriesCols = series.map(seriesToCollection);
    const genreCols = genres.map(genreToCollection);
    return [...seriesCols, ...genreCols].slice(0, limit);
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
