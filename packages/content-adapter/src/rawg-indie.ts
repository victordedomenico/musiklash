import type {
  ContentCollection,
  ContentEntity,
  ContentItem,
  ContentSource,
} from "./types";
import type { RawgDeveloper, RawgGame } from "./rawg";

const RAWG_BASE = "https://api.rawg.io/api";

/** RAWG tag id for "Indie" — https://api.rawg.io/api/tags */
export const INDIE_TAG_ID = "31";

/** PC + Mac + Linux + Switch — common indie storefronts. */
export const INDIE_PLATFORM_IDS = "4,5,6,7";

const INDIE_JAMS: {
  id: string;
  name: string;
  searchHint: string;
}[] = [
  { id: "jam-ludum", name: "Ludum Dare", searchHint: "ludum dare" },
  { id: "jam-ggj", name: "Global Game Jam", searchHint: "global game jam" },
  { id: "jam-itch", name: "Itch.io Game Jam", searchHint: "itch game jam" },
];

type RawgPaged<T> = { results?: T[] };

type RawgTag = {
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

function indieParams(extra: Record<string, string> = {}): Record<string, string> {
  return {
    tags: INDIE_TAG_ID,
    platforms: INDIE_PLATFORM_IDS,
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
      indie: true,
    },
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

function jamToEntity(jam: (typeof INDIE_JAMS)[number]): ContentEntity {
  return {
    id: jam.id,
    name: jam.name,
    source: "rawg",
    metadata: { entityKind: "jam", searchHint: jam.searchHint },
  };
}

function tagToCollection(t: RawgTag): ContentCollection {
  return {
    id: `tag-${t.id}`,
    title: t.name,
    coverUrl: t.image_background ?? undefined,
    source: "rawg",
    metadata: { collectionKind: "tag", tagId: t.id, slug: t.slug },
  };
}

// ─── Public RAW API helpers ───────────────────────────────────────────────────

export async function searchIndieGames(query: string, limit = 20): Promise<RawgGame[]> {
  if (!query.trim()) return [];
  const json = await rawgGet<RawgPaged<RawgGame>>(
    "/games",
    indieParams({
      search: query.trim(),
      page_size: String(Math.min(limit, 40)),
      page: "1",
      ordering: "-rating",
    }),
  );
  return (json.results ?? []).slice(0, limit);
}

export async function searchIndieDevelopers(
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

export async function searchIndieTags(query: string, limit = 20): Promise<RawgTag[]> {
  if (!query.trim()) return [];
  const json = await rawgGet<RawgPaged<RawgTag>>("/tags", {
    search: query.trim(),
    page_size: String(Math.min(limit, 40)),
    page: "1",
  });
  return (json.results ?? []).slice(0, limit);
}

export async function getTagIndieGames(
  tagId: string | number,
  limit = 50,
): Promise<RawgGame[]> {
  const json = await rawgGet<RawgPaged<RawgGame>>(
    "/games",
    indieParams({
      tags: `${tagId},${INDIE_TAG_ID}`,
      ordering: "-rating",
      page_size: String(Math.min(limit, 40)),
      page: "1",
    }),
  );
  return (json.results ?? []).slice(0, limit);
}

export async function getJamIndieGames(jamId: string, limit = 50): Promise<RawgGame[]> {
  const jam = INDIE_JAMS.find((j) => j.id === jamId);
  if (!jam) return [];
  const json = await rawgGet<RawgPaged<RawgGame>>(
    "/games",
    indieParams({
      search: jam.searchHint,
      ordering: "-rating",
      page_size: String(Math.min(limit, 40)),
      page: "1",
    }),
  );
  return (json.results ?? []).slice(0, limit);
}

export async function getDeveloperIndieGames(
  developerId: string | number,
  limit = 50,
): Promise<RawgGame[]> {
  const json = await rawgGet<RawgPaged<RawgGame>>(
    "/games",
    indieParams({
      developers: String(developerId),
      ordering: "-rating",
      page_size: String(Math.min(limit, 40)),
      page: "1",
    }),
  );
  return (json.results ?? []).slice(0, limit);
}

export async function getTrendingIndieGames(limit = 18): Promise<RawgGame[]> {
  const json = await rawgGet<RawgPaged<RawgGame>>(
    "/games",
    indieParams({
      ordering: "-rating",
      page_size: String(Math.min(limit, 40)),
      page: "1",
      metacritic: "70,100",
    }),
  );
  return (json.results ?? []).slice(0, limit);
}

// ─── ContentSource ───────────────────────────────────────────────────────────

export const rawgIndieContentSource: ContentSource = {
  source: "rawg",

  async searchItems(query, { limit = 20 } = {}) {
    const games = await searchIndieGames(query, limit);
    return games.map(gameToItem);
  },

  async searchItemsByKind(kind, query, options) {
    if (kind === "game") {
      return this.searchItems(query, options);
    }
    return this.searchItems(query, options);
  },

  async searchCollections(query, { limit = 20 } = {}) {
    const tags = await searchIndieTags(query, limit);
    return tags.map(tagToCollection);
  },

  async searchEntities(query, { limit = 20 } = {}) {
    const q = query.trim().toLowerCase();
    const jams = INDIE_JAMS.map(jamToEntity).filter(
      (e) => !q || e.name.toLowerCase().includes(q),
    );
    const devs = await searchIndieDevelopers(query, Math.ceil(limit / 2));
    return [...jams, ...devs.map(developerToEntity)].slice(0, limit);
  },

  async getCollectionItems(collectionId) {
    if (collectionId.startsWith("tag-")) {
      const tagId = collectionId.replace(/^tag-/, "");
      const games = await getTagIndieGames(tagId);
      return games.map(gameToItem);
    }
    return [];
  },

  async getEntityTopItems(entityId, { limit = 50 } = {}) {
    if (entityId.startsWith("jam-")) {
      const games = await getJamIndieGames(entityId, limit);
      return games.map(gameToItem);
    }
    const games = await getDeveloperIndieGames(entityId, limit);
    return games.map(gameToItem);
  },

  async getEntityById(entityId) {
    const jam = INDIE_JAMS.find((j) => j.id === entityId);
    if (jam) return jamToEntity(jam);
    try {
      const dev = await rawgGet<RawgDeveloper>(`/developers/${entityId}`);
      return developerToEntity(dev);
    } catch {
      return null;
    }
  },

  async getEntityCollections() {
    return [];
  },
};
