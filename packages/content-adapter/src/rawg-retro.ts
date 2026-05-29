import type {
  ContentCollection,
  ContentEntity,
  ContentItem,
  ContentSource,
} from "./types";
import type { RawgGame } from "./rawg";

const RAWG_BASE = "https://api.rawg.io/api";

/** Classic platforms (RAWG ids) — NES, SNES, GB, GBA, Genesis, Neo Geo, Atari, Master System, PS1. */
export const RETRO_PLATFORM_IDS =
  "83,21,22,24,28,79,80,86,87,88,11,15";

export const RETRO_DATE_MIN = "1970-01-01";
export const RETRO_DATE_MAX = "2005-12-31";

const RETRO_ERAS: {
  id: string;
  name: string;
  dateFrom: string;
  dateTo: string;
}[] = [
  { id: "era-80s", name: "Années 80", dateFrom: "1980-01-01", dateTo: "1989-12-31" },
  { id: "era-90s", name: "Années 90", dateFrom: "1990-01-01", dateTo: "1999-12-31" },
  { id: "era-00s", name: "Début 2000", dateFrom: "2000-01-01", dateTo: RETRO_DATE_MAX },
];

type RawgPaged<T> = { results?: T[] };

type RawgPlatform = {
  id: number;
  name: string;
  slug: string;
  games_count?: number;
  image_background?: string | null;
};

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

function retroParams(extra: Record<string, string> = {}): Record<string, string> {
  return {
    dates: `${RETRO_DATE_MIN},${RETRO_DATE_MAX}`,
    platforms: RETRO_PLATFORM_IDS,
    ...extra,
  };
}

async function rawgGet<T>(
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  const url = new URL(`${RAWG_BASE}${path}`);
  url.searchParams.set("key", getApiKey());
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    next: { revalidate: 3600 } as any,
  });

  if (!res.ok) {
    throw new Error(`RAWG ${path} → ${res.status}`);
  }
  return res.json() as Promise<T>;
}

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
      retro: true,
    },
  };
}

function platformToCollection(p: RawgPlatform): ContentCollection {
  return {
    id: `platform-${p.id}`,
    title: p.name,
    coverUrl: p.image_background ?? undefined,
    source: "rawg",
    metadata: { collectionKind: "platform", platformId: p.id, gamesCount: p.games_count },
  };
}

function eraToEntity(era: (typeof RETRO_ERAS)[number]): ContentEntity {
  return {
    id: era.id,
    name: era.name,
    source: "rawg",
    metadata: {
      entityKind: "era",
      dateFrom: era.dateFrom,
      dateTo: era.dateTo,
    },
  };
}

// ─── Public RAW API helpers ───────────────────────────────────────────────────

export async function searchRetroGames(query: string, limit = 20): Promise<RawgGame[]> {
  if (!query.trim()) return [];
  const json = await rawgGet<RawgPaged<RawgGame>>(
    "/games",
    retroParams({
      search: query.trim(),
      page_size: String(Math.min(limit, 40)),
      page: "1",
      ordering: "-rating",
    }),
  );
  return (json.results ?? []).slice(0, limit);
}

export async function searchRetroPlatforms(
  query: string,
  limit = 20,
): Promise<RawgPlatform[]> {
  if (!query.trim()) return [];
  const json = await rawgGet<RawgPaged<RawgPlatform>>("/platforms", {
    search: query.trim(),
    page_size: String(Math.min(limit, 40)),
    page: "1",
  });
  const ids = new Set(RETRO_PLATFORM_IDS.split(",").map((s) => s.trim()));
  return (json.results ?? []).filter((p) => ids.has(String(p.id))).slice(0, limit);
}

export async function getPlatformRetroGames(
  platformId: string | number,
  limit = 50,
): Promise<RawgGame[]> {
  const json = await rawgGet<RawgPaged<RawgGame>>(
    "/games",
    retroParams({
      platforms: String(platformId),
      ordering: "-released",
      page_size: String(Math.min(limit, 40)),
      page: "1",
    }),
  );
  return (json.results ?? []).slice(0, limit);
}

export async function getEraRetroGames(
  eraId: string,
  limit = 50,
): Promise<RawgGame[]> {
  const era = RETRO_ERAS.find((e) => e.id === eraId);
  if (!era) return [];
  const json = await rawgGet<RawgPaged<RawgGame>>("/games", {
    dates: `${era.dateFrom},${era.dateTo}`,
    platforms: RETRO_PLATFORM_IDS,
    ordering: "-rating",
    page_size: String(Math.min(limit, 40)),
    page: "1",
  });
  return (json.results ?? []).slice(0, limit);
}

export async function getTrendingRetroGames(limit = 18): Promise<RawgGame[]> {
  const json = await rawgGet<RawgPaged<RawgGame>>(
    "/games",
    retroParams({
      ordering: "-rating",
      page_size: String(Math.min(limit, 40)),
      page: "1",
      metacritic: "70,100",
    }),
  );
  return (json.results ?? []).slice(0, limit);
}

/** Optional Internet Archive game search (open API, no key). */
export async function searchInternetArchiveGames(
  query: string,
  limit = 10,
): Promise<ContentItem[]> {
  if (!query.trim()) return [];
  const url = new URL("https://archive.org/advancedsearch.php");
  url.searchParams.set("q", `title:(${query.trim()}) AND mediatype:software`);
  url.searchParams.set("fl[]", "identifier,title,description");
  url.searchParams.set("rows", String(Math.min(limit, 20)));
  url.searchParams.set("output", "json");

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      next: { revalidate: 86400 } as any,
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      response?: { docs?: { identifier?: string; title?: string }[] };
    };
    return (json.response?.docs ?? []).slice(0, limit).map((doc) => ({
      id: `ia-${doc.identifier ?? ""}`,
      title: doc.title ?? doc.identifier ?? "Jeu",
      subtitle: "Internet Archive",
      coverUrl: doc.identifier
        ? `https://archive.org/services/img/${doc.identifier}`
        : undefined,
      source: "internet-archive",
      metadata: { itemKind: "game", archiveId: doc.identifier, retro: true },
    }));
  } catch {
    return [];
  }
}

// ─── ContentSource ───────────────────────────────────────────────────────────

export const rawgRetroContentSource: ContentSource = {
  source: "rawg",

  async searchItems(query, { limit = 20 } = {}) {
    const [rawgGames, archiveExtras] = await Promise.all([
      searchRetroGames(query, limit),
      searchInternetArchiveGames(query, Math.min(5, limit)),
    ]);
    const rawgItems = rawgGames.map(gameToItem);
    const seen = new Set(rawgItems.map((i) => i.title.toLowerCase()));
    const merged = [...rawgItems];
    for (const item of archiveExtras) {
      if (merged.length >= limit) break;
      if (!seen.has(item.title.toLowerCase())) {
        merged.push(item);
        seen.add(item.title.toLowerCase());
      }
    }
    return merged.slice(0, limit);
  },

  async searchItemsByKind(kind, query, options) {
    if (kind === "game") {
      return this.searchItems(query, options);
    }
    return this.searchItems(query, options);
  },

  async searchCollections(query, { limit = 20 } = {}) {
    const platforms = await searchRetroPlatforms(query, limit);
    return platforms.map(platformToCollection);
  },

  async searchEntities(query, { limit = 20 } = {}) {
    const q = query.trim().toLowerCase();
    const eras = RETRO_ERAS.map(eraToEntity).filter(
      (e) => !q || e.name.toLowerCase().includes(q),
    );
    return eras.slice(0, limit);
  },

  async getCollectionItems(collectionId) {
    if (collectionId.startsWith("platform-")) {
      const platformId = collectionId.replace(/^platform-/, "");
      const games = await getPlatformRetroGames(platformId);
      return games.map(gameToItem);
    }
    return [];
  },

  async getEntityTopItems(entityId, { limit = 50 } = {}) {
    if (entityId.startsWith("era-")) {
      const games = await getEraRetroGames(entityId, limit);
      return games.map(gameToItem);
    }
    return [];
  },

  async getEntityById(entityId) {
    const era = RETRO_ERAS.find((e) => e.id === entityId);
    return era ? eraToEntity(era) : null;
  },

  async getEntityCollections() {
    return [];
  },
};
