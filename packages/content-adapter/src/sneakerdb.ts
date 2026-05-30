import type {
  ContentCollection,
  ContentEntity,
  ContentItem,
  ContentSource,
} from "./types";

const BASE = "https://api.thesneakerdatabase.com/v1";

// ─── Raw types ────────────────────────────────────────────────────────────────

export type SneakerDbItem = {
  id: string;
  sku?: string;
  brand?: string;
  name?: string;
  colorway?: string;
  gender?: string;
  silhouette?: string;
  releaseYear?: string;
  releaseDate?: string;
  retailPrice?: number;
  estimatedMarketValue?: number;
  story?: string;
  image?: {
    original?: string;
    small?: string;
    thumbnail?: string;
  };
  links?: {
    stockX?: string;
    goat?: string;
    flightClub?: string;
    stadiumGoods?: string;
  };
};

type SneakerDbResponse = {
  count?: number;
  results?: SneakerDbItem[];
};

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function sdbGet<T>(
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    next: { revalidate: 3600 } as any,
  });
  if (!res.ok) throw new Error(`SneakerDB ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function searchSneakerDb(
  query: string,
  limit = 20,
): Promise<SneakerDbItem[]> {
  if (!query.trim()) return [];
  try {
    const json = await sdbGet<SneakerDbResponse>("/sneakers", {
      name: query.trim(),
      limit: String(Math.min(limit, 40)),
    });
    return (json.results ?? []).filter((s) => s.name).slice(0, limit);
  } catch {
    return [];
  }
}

export async function getTrendingSneakerDb(limit = 18): Promise<SneakerDbItem[]> {
  try {
    const json = await sdbGet<SneakerDbResponse>("/sneakers", {
      limit: String(Math.min(limit, 40)),
      releaseYear: String(new Date().getFullYear()),
    });
    return (json.results ?? []).filter((s) => s.name && s.image?.original).slice(0, limit);
  } catch {
    return [];
  }
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function sneakerToItem(s: SneakerDbItem): ContentItem {
  const subtitle = [
    s.brand,
    s.colorway,
    s.retailPrice ? `${s.retailPrice} $` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    id: `sdb-${s.id}`,
    title: s.name ?? "Sneaker",
    subtitle: subtitle || undefined,
    coverUrl: s.image?.original ?? s.image?.small ?? s.image?.thumbnail,
    source: "sneakerdb",
    metadata: {
      itemKind: "sneaker",
      brand: s.brand,
      sku: s.sku,
      colorway: s.colorway,
      silhouette: s.silhouette,
      releaseDate: s.releaseDate,
      retailPrice: s.retailPrice,
      estimatedMarketValue: s.estimatedMarketValue,
    },
  };
}

function brandFromResults(results: SneakerDbItem[]): string[] {
  const seen = new Set<string>();
  const brands: string[] = [];
  for (const s of results) {
    const b = s.brand?.trim();
    if (!b || seen.has(b.toLowerCase())) continue;
    seen.add(b.toLowerCase());
    brands.push(b);
  }
  return brands;
}

// ─── ContentSource ────────────────────────────────────────────────────────────

export const sneakerDbContentSource: ContentSource = {
  source: "sneakerdb",

  async searchItems(query, { limit = 20 } = {}) {
    const results = await searchSneakerDb(query, limit);
    return results.map(sneakerToItem);
  },

  async searchItemsByKind(kind, query, { limit = 20 } = {}) {
    return this.searchItems(query, { limit });
  },

  async searchCollections(query, { limit = 20 } = {}) {
    const results = await searchSneakerDb(query || "jordan", limit);
    return results.map((s) => ({
      id: `sdb-${s.id}`,
      title: s.name ?? "Sneaker",
      coverUrl: s.image?.original ?? s.image?.small,
      source: "sneakerdb",
      metadata: {
        collectionKind: "sneaker",
        brand: s.brand,
        sku: s.sku,
        silhouette: s.silhouette,
      },
    }));
  },

  async searchEntities(query, { limit = 20 } = {}) {
    const results = await searchSneakerDb(query, Math.min(limit * 3, 40));
    const brands = brandFromResults(results).slice(0, limit);
    return brands.map((brand) => {
      const sample = results.find(
        (s) => s.brand?.toLowerCase() === brand.toLowerCase(),
      );
      return {
        id: `brand-${brand.toLowerCase().replace(/\s+/g, "-")}`,
        name: brand,
        pictureUrl: sample?.image?.original ?? sample?.image?.small,
        source: "sneakerdb",
        metadata: { entityKind: "brand", brand },
      };
    });
  },

  async getCollectionItems(collectionId) {
    // collectionId = sdb-{uuid}, try fetching by sku
    const uuid = collectionId.replace(/^sdb-/, "");
    try {
      const json = await sdbGet<SneakerDbResponse>("/sneakers", { id: uuid, limit: "1" });
      const item = json.results?.[0];
      if (item) return [sneakerToItem(item)];
    } catch { /* fall through */ }
    return [];
  },

  async getEntityTopItems(entityId, { limit = 50 } = {}) {
    const brand = entityId
      .replace(/^brand-/, "")
      .replace(/-/g, " ");
    try {
      const json = await sdbGet<SneakerDbResponse>("/sneakers", {
        brand,
        limit: String(Math.min(limit, 40)),
      });
      return (json.results ?? []).map(sneakerToItem);
    } catch {
      return [];
    }
  },

  async getEntityById(entityId) {
    const brand = entityId.replace(/^brand-/, "").replace(/-/g, " ");
    return {
      id: entityId,
      name: brand,
      source: "sneakerdb",
      metadata: { entityKind: "brand", brand },
    };
  },

  async getEntityCollections() {
    return [];
  },
};
