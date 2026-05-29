import type {
  ContentCollection,
  ContentEntity,
  ContentItem,
  ContentSource,
} from "./types";

const TVMAZE_BASE = "https://api.tvmaze.com";
const TMDB_IMAGE_CDN = "https://image.tmdb.org/t/p/w500";

// ─── Raw TVMaze types (subset) ────────────────────────────────────────────────

export type TvmazeImage = { medium?: string; original?: string } | null;

export type TvmazeShow = {
  id: number;
  name: string;
  type?: string;
  language?: string;
  genres?: string[];
  status?: string;
  runtime?: number;
  premiered?: string;
  ended?: string;
  officialSite?: string;
  rating?: { average?: number | null };
  weight?: number;
  network?: { name?: string; country?: { name?: string } };
  webChannel?: { name?: string };
  externals?: { tvrage?: number | null; thetvdb?: number | null; imdb?: string | null };
  image?: TvmazeImage;
  summary?: string | null;
};

export type TvmazeSearchHit = { score: number; show: TvmazeShow };

export type TvmazeEpisode = {
  id: number;
  name: string;
  season: number;
  number: number | null;
  type?: string;
  airdate?: string;
  runtime?: number;
  rating?: { average?: number | null };
  image?: TvmazeImage;
  summary?: string | null;
};

export type TvmazeSeason = {
  id: number;
  number: number;
  name?: string;
  episodeOrder?: number;
  premiereDate?: string;
  endDate?: string;
  image?: TvmazeImage;
  summary?: string | null;
};

export type TvmazeCastEntry = {
  person: {
    id: number;
    name: string;
    image?: TvmazeImage;
    country?: { name?: string };
  };
  character: { name: string; image?: TvmazeImage };
};

// ─── Fetch ────────────────────────────────────────────────────────────────────

function stripHtml(html?: string | null): string | undefined {
  if (!html) return undefined;
  return html.replace(/<[^>]+>/g, "").trim() || undefined;
}

function imageUrl(img?: TvmazeImage): string | undefined {
  return img?.medium ?? img?.original ?? undefined;
}

function yearFromDate(date?: string): string | undefined {
  return date?.slice(0, 4) || undefined;
}

async function tvmazeGet<T>(path: string, options?: { live?: boolean }): Promise<T> {
  const res = await fetch(`${TVMAZE_BASE}${path}`, {
    headers: { Accept: "application/json" },
    ...(options?.live ? { cache: "no-store" as const } : {}),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(options?.live ? {} : ({ next: { revalidate: 3600 } } as any)),
  });
  if (!res.ok) {
    throw new Error(`TVMaze ${path} → ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function enrichPosterFromTmdb(
  showName: string,
  fallback?: string,
): Promise<string | undefined> {
  const key = process.env.TMDB_API_KEY?.trim();
  if (!key || fallback) return fallback;
  try {
    const url = new URL("https://api.themoviedb.org/3/search/tv");
    url.searchParams.set("api_key", key);
    url.searchParams.set("language", "fr-FR");
    url.searchParams.set("query", showName);
    const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
    if (!res.ok) return fallback;
    const json = (await res.json()) as { results?: { poster_path?: string | null }[] };
    const poster = json.results?.[0]?.poster_path;
    return poster ? `${TMDB_IMAGE_CDN}${poster}` : fallback;
  } catch {
    return fallback;
  }
}

function parseSeasonCollectionId(collectionId: string): { showId: string; season: number } | null {
  const m = /^season-(\d+)-(\d+)$/.exec(collectionId);
  if (!m) return null;
  return { showId: m[1], season: Number(m[2]) };
}

// ─── Raw API (for routes / home trending) ─────────────────────────────────────

export async function searchShows(query: string, limit = 20): Promise<TvmazeShow[]> {
  if (!query.trim()) return [];
  const hits = await tvmazeGet<TvmazeSearchHit[]>(
    `/search/shows?q=${encodeURIComponent(query.trim())}`,
  );
  return hits.slice(0, limit).map((h) => h.show);
}

export async function getShowById(showId: string | number): Promise<TvmazeShow | null> {
  try {
    return await tvmazeGet<TvmazeShow>(`/shows/${showId}`);
  } catch {
    return null;
  }
}

export async function getShowEpisodes(showId: string | number): Promise<TvmazeEpisode[]> {
  return tvmazeGet<TvmazeEpisode[]>(`/shows/${showId}/episodes`);
}

export async function getShowSeasons(showId: string | number): Promise<TvmazeSeason[]> {
  return tvmazeGet<TvmazeSeason[]>(`/shows/${showId}/seasons`);
}

export async function getShowCast(showId: string | number): Promise<TvmazeCastEntry[]> {
  return tvmazeGet<TvmazeCastEntry[]>(`/shows/${showId}/cast`);
}

export function castEntryToCharacterItem(entry: TvmazeCastEntry, showId: string | number): ContentItem {
  return {
    id: `tvchar-${showId}-${entry.person.id}`,
    title: entry.character.name,
    subtitle: entry.person.name,
    coverUrl: imageUrl(entry.character.image ?? entry.person.image),
    source: "tvmaze",
    metadata: {
      itemKind: "character",
      personId: entry.person.id,
      personName: entry.person.name,
      showId: String(showId),
    },
  };
}

export async function getTrendingShows(limit = 18): Promise<TvmazeShow[]> {
  const page0 = await tvmazeGet<TvmazeShow[]>("/shows?page=0");
  return page0
    .filter((s) => s.image)
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
    .slice(0, limit);
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function showSubtitle(show: TvmazeShow): string | undefined {
  const parts: string[] = [];
  const year = yearFromDate(show.premiered);
  if (year) parts.push(year);
  if (show.genres?.length) parts.push(show.genres.slice(0, 2).join(", "));
  return parts.join(" · ") || undefined;
}

async function showToItem(show: TvmazeShow): Promise<ContentItem> {
  const cover = await enrichPosterFromTmdb(show.name, imageUrl(show.image));
  return {
    id: String(show.id),
    title: show.name,
    subtitle: showSubtitle(show),
    coverUrl: cover,
    source: "tvmaze",
    metadata: {
      itemKind: "show",
      status: show.status,
      premiered: show.premiered,
      rating: show.rating?.average,
      genres: show.genres,
      summary: stripHtml(show.summary),
    },
  };
}

function episodeToItem(ep: TvmazeEpisode, show?: TvmazeShow): ContentItem {
  const epLabel =
    ep.number != null ? `S${ep.season}E${String(ep.number).padStart(2, "0")}` : `Saison ${ep.season}`;
  return {
    id: `ep-${ep.id}`,
    title: ep.name || `Épisode ${ep.number ?? "?"}`,
    subtitle: show ? `${show.name} · ${epLabel}` : epLabel,
    coverUrl: imageUrl(ep.image) ?? (show ? imageUrl(show.image) : undefined),
    source: "tvmaze",
    metadata: {
      itemKind: "episode",
      showId: show?.id,
      showName: show?.name,
      season: ep.season,
      number: ep.number,
      airdate: ep.airdate,
      rating: ep.rating?.average,
      summary: stripHtml(ep.summary),
    },
  };
}

function seasonToCollection(season: TvmazeSeason, show: TvmazeShow): ContentCollection {
  const title = season.name?.trim()
    ? `${show.name} — ${season.name}`
    : `${show.name} — Saison ${season.number}`;
  return {
    id: `season-${show.id}-${season.number}`,
    title,
    coverUrl: imageUrl(season.image) ?? imageUrl(show.image),
    source: "tvmaze",
    metadata: {
      showId: show.id,
      showName: show.name,
      seasonNumber: season.number,
      episodeOrder: season.episodeOrder,
      premiereDate: season.premiereDate,
    },
  };
}

function showToEntity(show: TvmazeShow, coverUrl?: string): ContentEntity {
  return {
    id: String(show.id),
    name: show.name,
    pictureUrl: coverUrl ?? imageUrl(show.image),
    fanCount: show.weight ? Math.round(show.weight) : undefined,
    source: "tvmaze",
    metadata: {
      status: show.status,
      premiered: show.premiered,
      genres: show.genres,
      rating: show.rating?.average,
      summary: stripHtml(show.summary),
    },
  };
}

// ─── ContentSource ────────────────────────────────────────────────────────────

export const tvmazeContentSource: ContentSource = {
  source: "tvmaze",

  async searchItems(query, { limit = 20 } = {}) {
    const shows = await searchShows(query, Math.min(limit, 5));
    const items: ContentItem[] = [];
    for (const show of shows) {
      items.push(await showToItem(show));
    }
    return items.slice(0, limit);
  },

  async searchItemsByKind(kind, query, { limit = 20 } = {}) {
    if (kind === "show") {
      const shows = await searchShows(query, limit);
      return Promise.all(shows.map(showToItem));
    }
    if (kind === "show-cast") {
      // query = showId; returns characters from the show's cast
      const cast = await getShowCast(query);
      return cast.map((entry) => castEntryToCharacterItem(entry, query));
    }
    if (kind === "episode") {
      const shows = await searchShows(query, Math.min(limit, 4));
      const items: ContentItem[] = [];
      for (const show of shows) {
        const episodes = await getShowEpisodes(show.id);
        const q = query.trim().toLowerCase();
        const matched = episodes.filter(
          (ep) =>
            ep.name?.toLowerCase().includes(q) ||
            show.name.toLowerCase().includes(q),
        );
        for (const ep of matched.slice(0, Math.ceil(limit / shows.length))) {
          items.push(episodeToItem(ep, show));
        }
      }
      return items.slice(0, limit);
    }
    return this.searchItems(query, { limit });
  },

  async searchCollections(query, { limit = 20 } = {}) {
    const shows = await searchShows(query, Math.min(limit, 5));
    const collections: ContentCollection[] = [];
    for (const show of shows) {
      const seasons = await getShowSeasons(show.id);
      collections.push(...seasons.map((s) => seasonToCollection(s, show)));
    }
    return collections.slice(0, limit);
  },

  async searchEntities(query, { limit = 20 } = {}) {
    const shows = await searchShows(query, limit);
    return Promise.all(
      shows.map(async (show) => {
        const cover = await enrichPosterFromTmdb(show.name, imageUrl(show.image));
        return showToEntity(show, cover);
      }),
    );
  },

  async getCollectionItems(collectionId) {
    const parsed = parseSeasonCollectionId(collectionId);
    if (!parsed) return [];
    const [show, episodes] = await Promise.all([
      getShowById(parsed.showId),
      getShowEpisodes(parsed.showId),
    ]);
    if (!show) return [];
    return episodes
      .filter((ep) => ep.season === parsed.season)
      .map((ep) => episodeToItem(ep, show));
  },

  async getEntityTopItems(entityId, { limit = 50 } = {}) {
    const show = await getShowById(entityId);
    if (!show) return [];
    const episodes = await getShowEpisodes(entityId);
    episodes.sort((a, b) => {
      const sa = a.season * 1000 + (a.number ?? 0);
      const sb = b.season * 1000 + (b.number ?? 0);
      return sb - sa;
    });
    return episodes.slice(0, limit).map((ep) => episodeToItem(ep, show));
  },

  async getEntityById(entityId) {
    const show = await getShowById(entityId);
    if (!show) return null;
    const cover = await enrichPosterFromTmdb(show.name, imageUrl(show.image));
    return showToEntity(show, cover);
  },

  async getEntityCollections(entityId, { limit = 20 } = {}) {
    const show = await getShowById(entityId);
    if (!show) return [];
    const seasons = await getShowSeasons(entityId);
    return seasons.slice(0, limit).map((s) => seasonToCollection(s, show));
  },
};
