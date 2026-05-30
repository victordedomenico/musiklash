import type { ContentEntity, ContentItem, ContentSource } from "./types";
import { anilistContentSource, getCharacterById, searchCharacters } from "./anilist";
import { searchMovies, getMovieCharacters, castToCharacterItem, getMovieById } from "./tmdb";
import { pokeapiContentSource } from "./pokeapi";
import { searchShows, getShowCast, castEntryToCharacterItem } from "./tvmaze";
import {
  searchSuperheroes,
  getSuperheroesByPublisher,
  superheroToItem,
  SUPERHERO_PUBLISHERS,
} from "./superhero";

// ─── Anime characters (AniList) ───────────────────────────────────────────────

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

// ─── Pokémon (PokéAPI) ────────────────────────────────────────────────────────

async function pokemonItems(query: string, limit: number): Promise<ContentItem[]> {
  try {
    return await pokeapiContentSource.searchItems(query, { limit });
  } catch {
    return [];
  }
}

// ─── Movie characters (TMDB) — search films, expose as drill-down anchors ──────

async function movieAnchors(query: string, limit: number): Promise<ContentItem[]> {
  try {
    const movies = await searchMovies(query, limit);
    return movies.map((m) => ({
      id: `movie-${m.id}`,
      title: m.title,
      subtitle: m.release_date?.slice(0, 4) ? `Film · ${m.release_date.slice(0, 4)}` : "Film",
      coverUrl: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : undefined,
      source: "tmdb" as const,
      metadata: { itemKind: "movie-anchor", tmdbMovieId: m.id, movieTitle: m.title },
    }));
  } catch {
    return [];
  }
}

// ─── Series characters (TVMaze) — search shows, expose as drill-down anchors ───

async function seriesAnchors(query: string, limit: number): Promise<ContentItem[]> {
  try {
    const shows = await searchShows(query, limit);
    return shows.map((s) => ({
      id: `show-${s.id}`,
      title: s.name,
      subtitle: s.premiered?.slice(0, 4) ? `Série · ${s.premiered.slice(0, 4)}` : "Série",
      coverUrl: s.image?.medium ?? s.image?.original ?? undefined,
      source: "tvmaze" as const,
      metadata: { itemKind: "show-anchor", tvmazeShowId: s.id },
    }));
  } catch {
    return [];
  }
}

/**
 * CharacterKlash — cross-universe character battles.
 * Sources: AniList (anime), Superhero API (Marvel/DC/Star Wars/...), PokéAPI,
 * TMDB (films), TVMaze (séries).
 */
export const characterKlashContentSource: ContentSource = {
  source: "characterklash",

  async searchItems(query, { limit = 25 } = {}) {
    const fifth = Math.max(2, Math.ceil(limit / 5));
    const [anime, heroes, pokemon, movies, series] = await Promise.all([
      animeCharacterItems(query, fifth),
      searchSuperheroes(query, fifth).then((hs) => hs.map(superheroToItem)),
      pokemonItems(query, fifth),
      movieAnchors(query, fifth),
      seriesAnchors(query, fifth),
    ]);
    return [...heroes, ...anime, ...pokemon, ...movies, ...series].slice(0, limit);
  },

  async searchItemsByKind(kind, query, { limit = 24 } = {}) {
    switch (kind) {
      case "character":
      case "anime_character":
        return animeCharacterItems(query, limit);
      case "hero":
      case "superhero":
        return (await searchSuperheroes(query, limit)).map(superheroToItem);
      case "pokemon":
        return pokemonItems(query, limit);
      case "movie":
      case "film":
        return movieAnchors(query, limit);
      case "series":
      case "show":
        return seriesAnchors(query, limit);
      default:
        return this.searchItems(query, { limit });
    }
  },

  async searchCollections(query, { limit = 20 } = {}) {
    // "Univers" = publishers (Marvel, DC, Star Wars...) — static, query filters labels
    const q = query.trim().toLowerCase();
    const pubs = q
      ? SUPERHERO_PUBLISHERS.filter((p) => p.label.toLowerCase().includes(q))
      : SUPERHERO_PUBLISHERS;
    return pubs.slice(0, limit).map((p) => ({
      id: `universe-${p.slug}`,
      title: p.label,
      source: "superhero" as const,
      metadata: { collectionKind: "universe", publisherSlug: p.slug },
    }));
  },

  async searchEntities(query, options) {
    return anilistContentSource.searchEntities(query, options);
  },

  async getCollectionItems(collectionId) {
    if (collectionId.startsWith("universe-")) {
      const slug = collectionId.replace("universe-", "");
      const heroes = await getSuperheroesByPublisher(slug, 60);
      return heroes.map(superheroToItem);
    }
    if (collectionId.startsWith("show-")) {
      const showId = collectionId.replace("show-", "");
      const cast = await getShowCast(showId);
      return cast.map((entry) => castEntryToCharacterItem(entry, showId));
    }
    if (collectionId.startsWith("movie-")) {
      const movieId = collectionId.replace("movie-", "");
      const [cast, movie] = await Promise.all([
        getMovieCharacters(movieId),
        getMovieById(movieId),
      ]);
      const m = movie ?? { id: Number(movieId), title: "", poster_path: null };
      return cast.map((c) => castToCharacterItem(c, m));
    }
    return anilistContentSource.getCollectionItems(collectionId);
  },

  getEntityTopItems: (...args) => anilistContentSource.getEntityTopItems(...args),
  getEntityById: (...args) => anilistContentSource.getEntityById(...args),
  getEntityCollections: (...args) => anilistContentSource.getEntityCollections(...args),
};

export { getCharacterById };
