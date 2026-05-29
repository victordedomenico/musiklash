import type {
  ContentCollection,
  ContentEntity,
  ContentItem,
  ContentSource,
} from "./types";

const BGG_BASE = "https://boardgamegeek.com/xmlapi2";
const BGG_USER_AGENT = "BoardKlash/1.0 (+https://boardklash.vercel.app)";

// ─── Raw BGG shapes (parsed from XML) ─────────────────────────────────────────

export type BggSearchHit = {
  id: string;
  type: string;
  name: string;
  year?: string;
};

export type BggBoardGame = {
  id: string;
  name: string;
  year?: string;
  thumbnail?: string;
  image?: string;
  minPlayers?: number;
  maxPlayers?: number;
  playingTime?: number;
  averageRating?: number;
  rank?: number;
  mechanics?: { id: string; name: string }[];
  categories?: { id: string; name: string }[];
};

type BggLink = { id: string; name: string };

// ─── XML helpers ──────────────────────────────────────────────────────────────

function attrValue(tag: string, attr: string): string | undefined {
  const re = new RegExp(`${attr}="([^"]*)"`, "i");
  return re.exec(tag)?.[1];
}

function parseSearchItems(xml: string): BggSearchHit[] {
  const items: BggSearchHit[] = [];
  const itemRe = /<item\b([^>]*)>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    const attrs = m[1];
    const body = m[2];
    const id = attrValue(attrs, "id");
    const type = attrValue(attrs, "type");
    if (!id || !type) continue;
    const nameTag = /<name\b[^>]*\bvalue="([^"]*)"/i.exec(body);
    const yearTag = /<yearpublished\b[^>]*\bvalue="(\d+)"/i.exec(body);
    items.push({
      id,
      type,
      name: nameTag?.[1] ?? "",
      year: yearTag?.[1],
    });
  }
  return items;
}

function parseLinks(body: string, linkType: string): BggLink[] {
  const links: BggLink[] = [];
  const re = new RegExp(
    `<link\\b[^>]*\\btype="${linkType}"[^>]*\\bid="(\\d+)"[^>]*\\bvalue="([^"]*)"`,
    "gi",
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    links.push({ id: m[1], name: m[2] });
  }
  return links;
}

function parseThings(xml: string): BggBoardGame[] {
  const games: BggBoardGame[] = [];
  const itemRe = /<item\b([^>]*)>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    const attrs = m[1];
    const body = m[2];
    const id = attrValue(attrs, "id");
    if (!id) continue;
    const nameTag = /<name\b[^>]*\btype="primary"[^>]*\bvalue="([^"]*)"/i.exec(body);
    const altName = /<name\b[^>]*\bvalue="([^"]*)"/i.exec(body);
    const yearTag = /<yearpublished\b[^>]*\bvalue="(\d+)"/i.exec(body);
    const thumbTag = /<thumbnail>([^<]*)<\/thumbnail>/i.exec(body);
    const imageTag = /<image>([^<]*)<\/image>/i.exec(body);
    const minP = /<minplayers\b[^>]*\bvalue="(\d+)"/i.exec(body);
    const maxP = /<maxplayers\b[^>]*\bvalue="(\d+)"/i.exec(body);
    const time = /<playingtime\b[^>]*\bvalue="(\d+)"/i.exec(body);
    const avg = /<average\b[^>]*\bvalue="([\d.]+)"/i.exec(body);
    const rank = /<rank\b[^>]*\btype="subtype"[^>]*\bvalue="(\d+)"/i.exec(body);

    games.push({
      id,
      name: nameTag?.[1] ?? altName?.[1] ?? "",
      year: yearTag?.[1],
      thumbnail: thumbTag?.[1]?.trim(),
      image: imageTag?.[1]?.trim(),
      minPlayers: minP ? Number(minP[1]) : undefined,
      maxPlayers: maxP ? Number(maxP[1]) : undefined,
      playingTime: time ? Number(time[1]) : undefined,
      averageRating: avg ? Number(avg[1]) : undefined,
      rank: rank ? Number(rank[1]) : undefined,
      mechanics: parseLinks(body, "boardgamemechanic"),
      categories: parseLinks(body, "boardgamecategory"),
    });
  }
  return games;
}

function parseHotIds(xml: string): string[] {
  const ids: string[] = [];
  const re = /<item\b[^>]*\bid="(\d+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    ids.push(m[1]);
  }
  return ids;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function bggFetch(path: string, params: Record<string, string> = {}): Promise<string> {
  const url = new URL(`${BGG_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/xml, text/xml",
        // BGG blocks custom User-Agents on some server IPs — omit to use default
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(attempt > 0 ? { cache: "no-store" as const } : ({ next: { revalidate: 3600 } } as any)),
    });

    // 202 = BGG is generating the response, retry after a delay
    if (res.status === 202) {
      await sleep(800 + attempt * 400);
      continue;
    }
    // 401/429/503 = rate-limited or bot-detected, retry with back-off
    if (res.status === 401 || res.status === 429 || res.status === 503) {
      if (attempt < 5) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      return ""; // Give up gracefully — callers handle empty XML as no results
    }
    if (!res.ok) {
      throw new Error(`BGG ${path} → ${res.status}`);
    }
    return res.text();
  }
  return ""; // Timed out — return empty rather than crashing
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function searchBoardGames(query: string, limit = 20): Promise<BggSearchHit[]> {
  if (!query.trim()) return [];
  const xml = await bggFetch("/search", {
    query: query.trim(),
    type: "boardgame",
    exact: "0",
  });
  return parseSearchItems(xml)
    .filter((i) => i.type === "boardgame" && i.name)
    .slice(0, limit);
}

export async function searchMechanics(query: string, limit = 20): Promise<BggSearchHit[]> {
  if (!query.trim()) return [];
  const xml = await bggFetch("/search", {
    query: query.trim(),
    type: "boardgamemechanic",
    exact: "0",
  });
  return parseSearchItems(xml)
    .filter((i) => i.type === "boardgamemechanic" && i.name)
    .slice(0, limit);
}

export async function searchCategories(query: string, limit = 20): Promise<BggSearchHit[]> {
  if (!query.trim()) return [];
  const xml = await bggFetch("/search", {
    query: query.trim(),
    type: "boardgamecategory",
    exact: "0",
  });
  return parseSearchItems(xml)
    .filter((i) => i.type === "boardgamecategory" && i.name)
    .slice(0, limit);
}

export async function getBoardGamesByIds(ids: string[]): Promise<BggBoardGame[]> {
  if (ids.length === 0) return [];
  const xml = await bggFetch("/thing", {
    id: ids.slice(0, 20).join(","),
    stats: "1",
  });
  return parseThings(xml);
}

export async function getBoardGameById(id: string): Promise<BggBoardGame | null> {
  const games = await getBoardGamesByIds([id]);
  return games[0] ?? null;
}

export async function getHotBoardGames(limit = 18): Promise<BggBoardGame[]> {
  const xml = await bggFetch("/hot", { type: "boardgame" });
  const ids = parseHotIds(xml).slice(0, Math.min(limit, 20));
  if (ids.length === 0) return [];
  return getBoardGamesByIds(ids);
}

export async function searchBoardGamesByMechanicName(
  mechanicName: string,
  limit = 50,
): Promise<BggBoardGame[]> {
  const hits = await searchBoardGames(mechanicName, limit);
  const ids = hits.map((h) => h.id);
  if (ids.length === 0) return [];
  return getBoardGamesByIds(ids);
}

export async function searchBoardGamesByCategoryName(
  categoryName: string,
  limit = 50,
): Promise<BggBoardGame[]> {
  const hits = await searchBoardGames(categoryName, limit);
  const ids = hits.map((h) => h.id);
  if (ids.length === 0) return [];
  const games = await getBoardGamesByIds(ids);
  const needle = categoryName.toLowerCase();
  return games
    .filter((g) => g.categories?.some((c) => c.name.toLowerCase().includes(needle)))
    .slice(0, limit);
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function playersSubtitle(g: BggBoardGame): string | undefined {
  const parts: string[] = [];
  if (g.year) parts.push(g.year);
  if (g.minPlayers != null && g.maxPlayers != null) {
    parts.push(`${g.minPlayers}–${g.maxPlayers} joueurs`);
  } else if (g.maxPlayers != null) {
    parts.push(`jusqu'à ${g.maxPlayers} joueurs`);
  }
  if (g.playingTime) parts.push(`${g.playingTime} min`);
  if (g.averageRating) parts.push(`★ ${g.averageRating.toFixed(1)}`);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function gameToItem(g: BggBoardGame): ContentItem {
  return {
    id: g.id,
    title: g.name,
    subtitle: playersSubtitle(g),
    coverUrl: g.thumbnail ?? g.image,
    source: "bgg",
    metadata: {
      itemKind: "boardgame",
      year: g.year,
      rank: g.rank,
      averageRating: g.averageRating,
      mechanics: g.mechanics?.map((m) => m.name),
      categories: g.categories?.map((c) => c.name),
    },
  };
}

function hitToItem(hit: BggSearchHit): ContentItem {
  const subtitle = hit.year ? `${hit.year}` : undefined;
  return {
    id: hit.id,
    title: hit.name,
    subtitle,
    source: "bgg",
    metadata: { itemKind: "boardgame", year: hit.year },
  };
}

function encodedEntityId(prefix: string, hit: BggSearchHit): string {
  return `${prefix}-${hit.id}::${encodeURIComponent(hit.name)}`;
}

function parseEncodedId(
  entityId: string,
  prefix: string,
): { bggId: string; name: string } | null {
  if (!entityId.startsWith(`${prefix}-`)) return null;
  const rest = entityId.slice(prefix.length + 1);
  const sep = rest.indexOf("::");
  if (sep < 0) return { bggId: rest, name: "" };
  return {
    bggId: rest.slice(0, sep),
    name: decodeURIComponent(rest.slice(sep + 2)),
  };
}

function mechanicToEntity(hit: BggSearchHit): ContentEntity {
  return {
    id: encodedEntityId("mechanic", hit),
    name: hit.name,
    source: "bgg",
    metadata: { entityKind: "mechanic", mechanicId: hit.id },
  };
}

function categoryToCollection(hit: BggSearchHit): ContentCollection {
  return {
    id: encodedEntityId("category", hit),
    title: hit.name,
    source: "bgg",
    metadata: { collectionKind: "category", categoryId: hit.id },
  };
}

function categoryToEntity(hit: BggSearchHit): ContentEntity {
  return {
    id: encodedEntityId("category", hit),
    name: hit.name,
    source: "bgg",
    metadata: { entityKind: "category", categoryId: hit.id },
  };
}

// ─── ContentSource ────────────────────────────────────────────────────────────

export const bggContentSource: ContentSource = {
  source: "bgg",

  async searchItems(query, { limit = 20 } = {}) {
    const hits = await searchBoardGames(query, limit);
    return hits.map(hitToItem);
  },

  async searchItemsByKind(kind, query, { limit = 20 } = {}) {
    if (kind === "boardgame" || kind === "game") {
      return this.searchItems(query, { limit });
    }
    return this.searchItems(query, { limit });
  },

  async searchCollections(query, { limit = 20 } = {}) {
    const categories = await searchCategories(query, limit);
    return categories.map(categoryToCollection);
  },

  async searchEntities(query, { limit = 20 } = {}) {
    const [mechanics, categories] = await Promise.all([
      searchMechanics(query, Math.ceil(limit / 2)),
      searchCategories(query, Math.ceil(limit / 2)),
    ]);
    return [
      ...mechanics.map(mechanicToEntity),
      ...categories.map(categoryToEntity),
    ].slice(0, limit);
  },

  async getCollectionItems(collectionId) {
    const parsed = parseEncodedId(collectionId, "category");
    if (!parsed?.name) return [];
    const games = await searchBoardGamesByCategoryName(parsed.name, 40);
    return games.map(gameToItem);
  },

  async getEntityTopItems(entityId, { limit = 50 } = {}) {
    const mechanic = parseEncodedId(entityId, "mechanic");
    if (mechanic?.name) {
      const games = await searchBoardGamesByMechanicName(mechanic.name, limit);
      return games.map(gameToItem);
    }
    const category = parseEncodedId(entityId, "category");
    if (category?.name) {
      const games = await searchBoardGamesByCategoryName(category.name, limit);
      return games.map(gameToItem);
    }
    return [];
  },

  async getEntityById(entityId) {
    const mechanic = parseEncodedId(entityId, "mechanic");
    if (mechanic) {
      const hits = await searchMechanics(mechanic.name || mechanic.bggId, 10);
      const hit =
        hits.find((h) => h.id === mechanic.bggId) ??
        hits.find((h) => h.name.toLowerCase() === mechanic.name.toLowerCase()) ??
        hits[0];
      return hit ? mechanicToEntity(hit) : null;
    }
    const category = parseEncodedId(entityId, "category");
    if (category) {
      const hits = await searchCategories(category.name || category.bggId, 10);
      const hit =
        hits.find((h) => h.id === category.bggId) ??
        hits.find((h) => h.name.toLowerCase() === category.name.toLowerCase()) ??
        hits[0];
      return hit ? categoryToEntity(hit) : null;
    }
    return null;
  },

  async getEntityCollections() {
    return [];
  },
};
