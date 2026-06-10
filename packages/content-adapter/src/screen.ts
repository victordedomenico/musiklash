import type { ContentCollection, ContentEntity, ContentItem, ContentSource } from "./types";
import { fetchTmdbArcsForTv, type StoryArc } from "./tmdb-arcs";
import {
  tmdbContentSource,
  searchMovies,
  getMovieById,
  getMovieCharacters,
  castToCharacterItem,
} from "./tmdb";
import {
  searchShows,
  getShowById,
  getShowCast,
  castEntryToCharacterItem,
} from "./tvmaze";
import { getShowThemeItems, searchScreenThemes } from "./screen-themes";

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
      metadata: { itemKind: "series", tvmazeShowId: s.id },
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

async function seriesCastAnchors(query: string, limit: number): Promise<ContentItem[]> {
  try {
    const shows = await searchShows(query, limit);
    return shows.map((s) => ({
      id: `showcast-${s.id}`,
      title: s.name,
      subtitle: "Voir les personnages",
      coverUrl: s.image?.medium ?? s.image?.original ?? undefined,
      source: "tvmaze" as const,
      metadata: { itemKind: "series-anchor", tvmazeShowId: s.id },
    }));
  } catch {
    return [];
  }
}

function storyArcToItem(arc: StoryArc, showName: string, coverUrl?: string): ContentItem {
  return {
    id: `arc-${arc.id}`,
    title: arc.title,
    subtitle: showName,
    coverUrl,
    source: "tmdb",
    metadata: {
      itemKind: "series-arc",
      arcId: arc.id,
      parentTitle: showName,
      episodes: arc.episodes,
      episodeRange: arc.animeEpisodes,
      saga: arc.saga,
    },
  };
}

function storyArcToCollection(arc: StoryArc, showName: string, coverUrl?: string): ContentCollection {
  return {
    id: String(arc.id),
    title: arc.title,
    coverUrl,
    source: "tmdb",
    metadata: {
      itemKind: "series-arc",
      parentTitle: showName,
      episodes: arc.episodes,
      episodeRange: arc.animeEpisodes,
      saga: arc.saga,
    },
  };
}

async function searchSeriesArcItems(query: string, limit: number): Promise<ContentItem[]> {
  const shows = await searchShows(query, Math.min(4, limit));
  const items: ContentItem[] = [];
  const q = query.trim().toLowerCase();
  for (const show of shows) {
    const cover = show.image?.medium ?? show.image?.original ?? undefined;
    const arcs = await fetchTmdbArcsForTv(`arc-search-${show.id}`, [show.name]);
    for (const arc of arcs) {
      if (
        arc.title.toLowerCase().includes(q) ||
        show.name.toLowerCase().includes(q) ||
        (arc.saga?.toLowerCase().includes(q) ?? false)
      ) {
        items.push(storyArcToItem(arc, show.name, cover));
      }
    }
    if (items.length >= limit) break;
  }
  return items.slice(0, limit);
}

function parseShowEntityId(entityId: string): string | null {
  const m = /^show-(\d+)$/.exec(entityId);
  if (m) return m[1];
  if (/^\d+$/.test(entityId)) return entityId;
  return null;
}

/**
 * ScreenKlash — films (TMDB) + séries (TVMaze) in one vertical.
 * Collection ids are prefixed so getCollectionItems can route without ambiguity:
 *   col-*       → TMDB saga
 *   moviecast-* → TMDB movie cast
 *   showcast-*  → TVMaze show cast
 *   show-*      → génériques OP/ED d'une série
 */
export const screenContentSource: ContentSource = {
  source: "screenklash",

  searchItems: (query, options) => tmdbContentSource.searchItems(query, options),

  async searchItemsByKind(kind, query, { limit = 20 } = {}) {
    switch (kind) {
      case "movie":
        return tmdbContentSource.searchItems(query, { limit });
      case "series":
      case "show":
        return seriesItems(query, limit);
      case "saga":
      case "collections":
        return tmdbContentSource.searchItemsByKind?.("collection", query, { limit }) ?? [];
      case "movie-cast":
      case "movie-character":
        return movieCastAnchors(query, limit);
      case "series-cast":
      case "series-character":
        return seriesCastAnchors(query, limit);
      case "series-arc":
      case "arc":
        return searchSeriesArcItems(query, limit);
      case "opening":
        return searchScreenThemes(query, "opening", limit);
      case "ending":
        return searchScreenThemes(query, "ending", limit);
      default:
        return tmdbContentSource.searchItems(query, { limit });
    }
  },

  searchCollections: (query, options) => tmdbContentSource.searchCollections(query, options),

  async searchEntities(query, options): Promise<ContentEntity[]> {
    const items = await seriesItems(query, options?.limit ?? 20);
    return items.map((i) => ({
      id: i.id.replace(/^show-/, ""),
      name: i.title,
      pictureUrl: i.coverUrl,
      source: i.source,
      metadata: i.metadata,
    }));
  },

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
    const showId = parseShowEntityId(collectionId);
    if (showId) {
      const themeKind = options?.themeKind;
      const filter =
        themeKind === "intro" || themeKind === "outro" ? themeKind : undefined;
      return getShowThemeItems(showId, filter);
    }
    return tmdbContentSource.getCollectionItems(collectionId, options);
  },

  async getEntityTopItems(entityId, options) {
    const showId = parseShowEntityId(entityId);
    if (showId) {
      return getShowThemeItems(showId, undefined).then((items) =>
        items.slice(0, options?.limit ?? 50),
      );
    }
    return tmdbContentSource.getEntityTopItems(entityId, options);
  },

  async getEntityById(entityId) {
    const showId = parseShowEntityId(entityId);
    if (showId) {
      const show = await getShowById(showId);
      if (!show) return null;
      return {
        id: showId,
        name: show.name,
        pictureUrl: show.image?.medium ?? show.image?.original ?? undefined,
        source: "tvmaze",
        metadata: { itemKind: "series", tvmazeShowId: show.id },
      };
    }
    return tmdbContentSource.getEntityById(entityId);
  },

  async getEntityCollections(entityId, { limit = 20 } = {}) {
    const showId = parseShowEntityId(entityId);
    if (showId) {
      const show = await getShowById(showId);
      if (!show) return [];
      const cover = show.image?.medium ?? show.image?.original ?? undefined;
      const arcs = await fetchTmdbArcsForTv(`show-arcs-${showId}`, [show.name]);
      return arcs.slice(0, limit).map((a) => storyArcToCollection(a, show.name, cover));
    }
    return tmdbContentSource.getEntityCollections(entityId, { limit });
  },
};
