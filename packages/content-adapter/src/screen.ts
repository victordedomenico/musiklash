import type { ContentItem, ContentCollection, ContentSource } from "./types";
import {
  tmdbContentSource,
  searchMovies,
  getMovieById,
  getMovieCharacters,
  castToCharacterItem,
} from "./tmdb";
import {
  searchShows,
  getShowCast,
  castEntryToCharacterItem,
} from "./tvmaze";

const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

// ─── Series (TVMaze) helpers ──────────────────────────────────────────────────

async function seriesItems(query: string, limit: number): Promise<ContentItem[]> {
  try {
    const shows = await searchShows(query, limit);
    return shows.map((s) => ({
      id: `show-${s.id}`,
      title: s.name,
      subtitle: s.premiered?.slice(0, 4) ? `Série · ${s.premiered.slice(0, 4)}` : "Série",
      coverUrl: s.image?.medium ?? s.image?.original ?? undefined,
      source: "tvmaze" as const,
      metadata: { itemKind: "show", tvmazeShowId: s.id },
    }));
  } catch {
    return [];
  }
}

async function seriesCastAnchors(query: string, limit: number): Promise<ContentItem[]> {
  try {
    const shows = await searchShows(query, limit);
    return shows.map((s) => ({
      id: `showcast-${s.id}`,
      title: s.name,
      subtitle: "Voir les personnages",
      coverUrl: s.image?.medium ?? s.image?.original ?? undefined,
      source: "tvmaze" as const,
      metadata: { itemKind: "show-anchor", tvmazeShowId: s.id },
    }));
  } catch {
    return [];
  }
}

async function movieCastAnchors(query: string, limit: number): Promise<ContentItem[]> {
  try {
    const movies = await searchMovies(query, limit);
    return movies.map((m) => ({
      id: `moviecast-${m.id}`,
      title: m.title,
      subtitle: "Voir les personnages",
      coverUrl: m.poster_path ? `${TMDB_IMG}${m.poster_path}` : undefined,
      source: "tmdb" as const,
      metadata: { itemKind: "movie-anchor", tmdbMovieId: m.id },
    }));
  } catch {
    return [];
  }
}

/**
 * ScreenKlash — films (TMDB) + séries (TVMaze) in one vertical.
 * Collection ids are prefixed so getCollectionItems can route without ambiguity:
 *   col-*       → TMDB saga
 *   moviecast-* → TMDB movie cast
 *   showcast-*  → TVMaze show cast
 */
export const screenContentSource: ContentSource = {
  source: "screenklash",

  // Default search = films
  searchItems: (query, options) => tmdbContentSource.searchItems(query, options),

  async searchItemsByKind(kind, query, { limit = 20 } = {}) {
    switch (kind) {
      case "movie":
        return tmdbContentSource.searchItems(query, { limit });
      case "series":
      case "show":
        return seriesItems(query, limit);
      case "movie-cast":
        return movieCastAnchors(query, limit);
      case "series-cast":
        return seriesCastAnchors(query, limit);
      default:
        return tmdbContentSource.searchItems(query, { limit });
    }
  },

  // Sagas = TMDB collections
  searchCollections: (query, options) => tmdbContentSource.searchCollections(query, options),

  searchEntities: (query, options) => tmdbContentSource.searchEntities(query, options),

  async getCollectionItems(collectionId, options) {
    if (collectionId.startsWith("moviecast-")) {
      const movieId = collectionId.replace("moviecast-", "");
      const [cast, movie] = await Promise.all([
        getMovieCharacters(movieId),
        getMovieById(movieId),
      ]);
      const m = movie ?? { id: Number(movieId), title: "", poster_path: null };
      return cast.map((c) => castToCharacterItem(c, m));
    }
    if (collectionId.startsWith("showcast-")) {
      const showId = collectionId.replace("showcast-", "");
      const cast = await getShowCast(showId);
      return cast.map((entry) => castEntryToCharacterItem(entry, showId));
    }
    // col-* → TMDB saga movies
    return tmdbContentSource.getCollectionItems(collectionId, options);
  },

  getEntityTopItems: (...args) => tmdbContentSource.getEntityTopItems(...args),
  getEntityById: (...args) => tmdbContentSource.getEntityById(...args),
  getEntityCollections: (...args) => tmdbContentSource.getEntityCollections(...args),
};
