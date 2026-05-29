import type {
  ContentCollection,
  ContentEntity,
  ContentItem,
  ContentSource,
} from "./types";

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMAGE_CDN = "https://image.tmdb.org/t/p/w500";
const TMDB_LANG = "fr-FR";

// ─── Raw TMDB types (subset) ──────────────────────────────────────────────────

export type TmdbMovie = {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  vote_average?: number;
  overview?: string;
  popularity?: number;
};

export type TmdbCastMember = {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
};

export type TmdbPerson = {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department?: string;
  popularity?: number;
};

export type TmdbCollection = {
  id: number;
  name: string;
  poster_path: string | null;
  overview?: string;
};

type TmdbPaged<T> = { results?: T[] };

type TmdbCollectionDetails = TmdbCollection & {
  parts?: TmdbMovie[];
};

type TmdbMovieCredit = TmdbMovie & {
  belongs_to_collection?: TmdbCollection | null;
  character?: string;
  job?: string;
};

type TmdbPersonCredits = {
  cast?: TmdbMovieCredit[];
  crew?: TmdbMovieCredit[];
};

// ─── Fetch ────────────────────────────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.TMDB_API_KEY?.trim();
  if (!key) {
    throw new Error("TMDB_API_KEY is not configured");
  }
  return key;
}

function posterUrl(path: string | null | undefined): string | undefined {
  return path ? `${IMAGE_CDN}${path}` : undefined;
}

function yearFromDate(date?: string): string | undefined {
  return date?.slice(0, 4) || undefined;
}

async function tmdbGet<T>(
  path: string,
  params: Record<string, string> = {},
  options?: { live?: boolean },
): Promise<T> {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", getApiKey());
  url.searchParams.set("language", TMDB_LANG);
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
    throw new Error(`TMDB ${path} → ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Raw API (for routes / home trending) ─────────────────────────────────────

export async function searchMovies(query: string, limit = 20): Promise<TmdbMovie[]> {
  if (!query.trim()) return [];
  const json = await tmdbGet<TmdbPaged<TmdbMovie>>("/search/movie", {
    query: query.trim(),
    page: "1",
    include_adult: "false",
  });
  return (json.results ?? []).slice(0, limit);
}

export async function searchMovieCollections(
  query: string,
  limit = 20,
): Promise<TmdbCollection[]> {
  if (!query.trim()) return [];
  const json = await tmdbGet<TmdbPaged<TmdbCollection>>("/search/collection", {
    query: query.trim(),
    page: "1",
  });
  return (json.results ?? []).slice(0, limit);
}

export async function searchPeople(query: string, limit = 20): Promise<TmdbPerson[]> {
  if (!query.trim()) return [];
  const json = await tmdbGet<TmdbPaged<TmdbPerson>>("/search/person", {
    query: query.trim(),
    page: "1",
    include_adult: "false",
  });
  return (json.results ?? []).slice(0, limit);
}

export async function getMovieById(movieId: string | number): Promise<TmdbMovie | null> {
  try {
    return await tmdbGet<TmdbMovie>(`/movie/${movieId}`);
  } catch {
    return null;
  }
}

export async function getCollectionById(
  collectionId: string | number,
): Promise<TmdbCollectionDetails | null> {
  try {
    return await tmdbGet<TmdbCollectionDetails>(`/collection/${collectionId}`);
  } catch {
    return null;
  }
}

export async function getCollectionMovies(
  collectionId: string | number,
): Promise<TmdbMovie[]> {
  const details = await getCollectionById(collectionId);
  return details?.parts ?? [];
}

export async function getPersonById(personId: string | number): Promise<TmdbPerson | null> {
  try {
    return await tmdbGet<TmdbPerson>(`/person/${personId}`);
  } catch {
    return null;
  }
}

export async function getPersonTopMovies(
  personId: string | number,
  limit = 50,
): Promise<TmdbMovie[]> {
  const credits = await tmdbGet<TmdbPersonCredits>(`/person/${personId}/movie_credits`);
  const cast = credits.cast ?? [];
  cast.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
  return cast.slice(0, limit);
}

export async function getTrendingMovies(limit = 18): Promise<TmdbMovie[]> {
  const json = await tmdbGet<TmdbPaged<TmdbMovie>>("/trending/movie/week", {
    page: "1",
  });
  return (json.results ?? []).slice(0, limit);
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function movieToItem(m: TmdbMovie): ContentItem {
  return {
    id: String(m.id),
    title: m.title,
    subtitle: yearFromDate(m.release_date),
    coverUrl: posterUrl(m.poster_path),
    source: "tmdb",
    metadata: {
      itemKind: "movie",
      releaseDate: m.release_date,
      voteAverage: m.vote_average,
      popularity: m.popularity,
      overview: m.overview,
    },
  };
}

function collectionToContent(c: TmdbCollection): ContentCollection {
  return {
    id: String(c.id),
    title: c.name,
    coverUrl: posterUrl(c.poster_path),
    source: "tmdb",
    metadata: { overview: c.overview },
  };
}

function personToEntity(p: TmdbPerson): ContentEntity {
  return {
    id: String(p.id),
    name: p.name,
    pictureUrl: posterUrl(p.profile_path),
    fanCount: p.popularity ? Math.round(p.popularity) : undefined,
    source: "tmdb",
    metadata: { knownForDepartment: p.known_for_department },
  };
}

export async function getMovieCharacters(movieId: string | number): Promise<TmdbCastMember[]> {
  try {
    const credits = await tmdbGet<{ cast?: TmdbCastMember[] }>(`/movie/${movieId}/credits`);
    return (credits.cast ?? [])
      .filter((c) => c.character && !c.character.toLowerCase().includes("uncredited"))
      .sort((a, b) => a.order - b.order)
      .slice(0, 30);
  } catch {
    return [];
  }
}

export function castToCharacterItem(cast: TmdbCastMember, movie: TmdbMovie): ContentItem {
  return {
    id: `mchar-${movie.id}-${cast.id}`,
    title: cast.character,
    subtitle: `${cast.name} · ${movie.title}`,
    coverUrl: posterUrl(cast.profile_path),
    source: "tmdb",
    metadata: {
      itemKind: "character",
      actorName: cast.name,
      actorId: cast.id,
      movieTitle: movie.title,
      movieId: movie.id,
    },
  };
}

function personToItem(p: TmdbPerson): ContentItem {
  return {
    id: `person-${p.id}`,
    title: p.name,
    subtitle: p.known_for_department,
    coverUrl: posterUrl(p.profile_path),
    source: "tmdb",
    metadata: {
      itemKind: "person",
      tmdbPersonId: p.id,
      knownForDepartment: p.known_for_department,
      popularity: p.popularity,
    },
  };
}

function collectionsFromCredits(credits: TmdbPersonCredits): ContentCollection[] {
  const seen = new Map<number, TmdbCollection>();
  for (const entry of [...(credits.cast ?? []), ...(credits.crew ?? [])]) {
    const col = entry.belongs_to_collection;
    if (col && !seen.has(col.id)) {
      seen.set(col.id, col);
    }
  }
  return [...seen.values()].map(collectionToContent);
}

// ─── ContentSource ────────────────────────────────────────────────────────────

export const tmdbContentSource: ContentSource = {
  source: "tmdb",

  async searchItems(query, { limit = 20 } = {}) {
    const movies = await searchMovies(query, limit);
    return movies.map(movieToItem);
  },

  async searchItemsByKind(kind, query, { limit = 20 } = {}) {
    if (kind === "movie") {
      return this.searchItems(query, { limit });
    }
    if (kind === "collection") {
      const cols = await searchMovieCollections(query, limit);
      return cols.map((c) => ({
        id: `col-${c.id}`,
        title: c.name,
        subtitle: "Saga / franchise",
        coverUrl: posterUrl(c.poster_path),
        source: "tmdb",
        metadata: { itemKind: "collection", collectionId: c.id },
      }));
    }
    if (kind === "person") {
      const people = await searchPeople(query, limit);
      return people.map(personToItem);
    }
    return this.searchItems(query, { limit });
  },

  async searchCollections(query, { limit = 20 } = {}) {
    const cols = await searchMovieCollections(query, limit);
    return cols.map(collectionToContent);
  },

  async searchEntities(query, { limit = 20 } = {}) {
    const people = await searchPeople(query, limit);
    return people.map(personToEntity);
  },

  async getCollectionItems(collectionId) {
    const id = collectionId.replace(/^col-/, "");
    const movies = await getCollectionMovies(id);
    return movies.map(movieToItem);
  },

  async getEntityTopItems(entityId, { limit = 50 } = {}) {
    const movies = await getPersonTopMovies(entityId, limit);
    return movies.map(movieToItem);
  },

  async getEntityById(entityId) {
    const person = await getPersonById(entityId);
    return person ? personToEntity(person) : null;
  },

  async getEntityCollections(entityId, { limit = 20 } = {}) {
    const credits = await tmdbGet<TmdbPersonCredits>(
      `/person/${entityId}/movie_credits`,
    );
    return collectionsFromCredits(credits).slice(0, limit);
  },
};
