/// <reference path="./sneaks-api.d.ts" />
/**
 * SneaksAPI (scraping StockX / GOAT / etc.) — usage serveur uniquement.
 *
 * Fragilité : pas d’API officielle, dépend du HTML des revendeurs ; peut casser
 * sans préavis. Prévoir cache, timeouts courts et dégradation gracieuse.
 * Voir catalog `sneakerklash.notes` et apps/sneakerklash/SNEAKS_API.md.
 */
import "server-only";
/// <reference path="./sneaks-api.d.ts" />
import type {
  ContentCollection,
  ContentEntity,
  ContentItem,
  ContentSource,
} from "./types";

export type SneaksProduct = {
  shoeName?: string;
  brand?: string;
  styleID?: string;
  silhoutte?: string;
  retailPrice?: number;
  thumbnail?: string;
  imageLinks?: string[];
  description?: string;
  lowestResellPrice?: { stockX?: number; goat?: number; flightClub?: number };
  resellLinks?: Record<string, string>;
};

type SneaksClient = {
  getProducts: (
    keyword: string,
    limit: number,
    cb: (err: Error | null, products: SneaksProduct[]) => void,
  ) => void;
  getMostPopular: (
    limit: number,
    cb: (err: Error | null, products: SneaksProduct[]) => void,
  ) => void;
  getProductPrices: (
    styleID: string,
    cb: (err: Error | null, product: SneaksProduct) => void,
  ) => void;
};

let client: SneaksClient | null = null;

async function getClient(): Promise<SneaksClient> {
  if (!client) {
    const mod = (await import("sneaks-api")) as {
      default?: new () => SneaksClient;
    };
    const SneaksAPI = mod.default ?? (mod as unknown as new () => SneaksClient);
    client = new SneaksAPI();
  }
  return client;
}

function promisifyProducts(
  fn: (cb: (err: Error | null, products: SneaksProduct[]) => void) => void,
): Promise<SneaksProduct[]> {
  return new Promise((resolve, reject) => {
    fn((err, products) => {
      if (err) reject(err);
      else resolve(products ?? []);
    });
  });
}

function promisifyProduct(
  fn: (cb: (err: Error | null, product: SneaksProduct) => void) => void,
): Promise<SneaksProduct | null> {
  return new Promise((resolve, reject) => {
    fn((err, product) => {
      if (err) reject(err);
      else resolve(product ?? null);
    });
  });
}

function coverUrl(p: SneaksProduct): string | undefined {
  return p.thumbnail ?? p.imageLinks?.[0];
}

function priceSubtitle(p: SneaksProduct): string | undefined {
  const parts: string[] = [];
  if (p.brand) parts.push(p.brand);
  if (p.styleID) parts.push(p.styleID);
  const low = p.lowestResellPrice;
  const price =
    low?.stockX ?? low?.goat ?? low?.flightClub ?? (p.retailPrice ? p.retailPrice : undefined);
  if (price != null) parts.push(`~$${price}`);
  return parts.length ? parts.join(" · ") : undefined;
}

function productToItem(p: SneaksProduct, index = 0): ContentItem {
  const styleId = p.styleID?.trim() || `unknown-${index}`;
  const title = p.shoeName?.trim() || p.silhoutte?.trim() || styleId;
  return {
    id: styleId,
    title,
    subtitle: priceSubtitle(p),
    coverUrl: coverUrl(p),
    source: "sneaks",
    metadata: {
      itemKind: "colorway",
      brand: p.brand,
      styleID: p.styleID,
      retailPrice: p.retailPrice,
      silhouette: p.silhoutte,
      resellLinks: p.resellLinks,
      lowestResellPrice: p.lowestResellPrice,
    },
  };
}

function productToCollection(p: SneaksProduct, index = 0): ContentCollection {
  const styleId = p.styleID?.trim() || `drop-${index}`;
  return {
    id: `drop-${styleId}`,
    title: p.shoeName?.trim() || `Drop ${styleId}`,
    coverUrl: coverUrl(p),
    source: "sneaks",
    metadata: {
      collectionKind: "drop",
      styleID: p.styleID,
      brand: p.brand,
    },
  };
}

function brandToEntity(brand: string, sample?: SneaksProduct): ContentEntity {
  const slug = brand.toLowerCase().replace(/\s+/g, "-");
  return {
    id: `brand-${slug}`,
    name: brand,
    pictureUrl: sample ? coverUrl(sample) : undefined,
    source: "sneaks",
    metadata: { entityKind: "model", brand },
  };
}

/** Recherche colorways (proxy serveur via ContentSource / route API). */
export async function searchSneakers(query: string, limit = 20): Promise<SneaksProduct[]> {
  if (!query.trim()) return [];
  const sneaks = await getClient();
  return promisifyProducts((cb) =>
    sneaks.getProducts(query.trim(), Math.min(limit, 40), cb),
  );
}

export async function getTrendingSneakers(limit = 18): Promise<SneaksProduct[]> {
  const sneaks = await getClient();
  return promisifyProducts((cb) => sneaks.getMostPopular(Math.min(limit, 40), cb));
}

export async function getSneakerByStyleId(styleID: string): Promise<SneaksProduct | null> {
  const id = styleID.trim();
  if (!id) return null;
  const sneaks = await getClient();
  return promisifyProduct((cb) => sneaks.getProductPrices(id, cb));
}

function uniqueBrands(products: SneaksProduct[]): string[] {
  const seen = new Set<string>();
  const brands: string[] = [];
  for (const p of products) {
    const b = p.brand?.trim();
    if (!b || seen.has(b.toLowerCase())) continue;
    seen.add(b.toLowerCase());
    brands.push(b);
  }
  return brands;
}

export const sneaksContentSource: ContentSource = {
  source: "sneaks",

  async searchItems(query, { limit = 20 } = {}) {
    const products = await searchSneakers(query, limit);
    return products.map((p, i) => productToItem(p, i));
  },

  async searchItemsByKind(kind, query, { limit = 20 } = {}) {
    if (kind === "colorway" || kind === "drop") {
      return this.searchItems(query, { limit });
    }
    if (kind === "model") {
      const entities = await this.searchEntities(query, { limit });
      return entities.map((e) => ({
        id: e.id,
        title: e.name,
        subtitle: "Modèle / marque",
        coverUrl: e.pictureUrl,
        source: "sneaks",
        metadata: { itemKind: "model", brand: e.metadata?.brand },
      }));
    }
    return this.searchItems(query, { limit });
  },

  async searchCollections(query, { limit = 20 } = {}) {
    if (query.trim()) {
      const products = await searchSneakers(query, limit);
      return products.map((p, i) => productToCollection(p, i));
    }
    const popular = await getTrendingSneakers(limit);
    return popular.map((p, i) => productToCollection(p, i));
  },

  async searchEntities(query, { limit = 20 } = {}) {
    const products = await searchSneakers(query, Math.min(limit * 3, 40));
    const brands = uniqueBrands(products).slice(0, limit);
    return brands.map((brand) => {
      const sample = products.find((p) => p.brand?.toLowerCase() === brand.toLowerCase());
      return brandToEntity(brand, sample);
    });
  },

  async getCollectionItems(collectionId) {
    const styleId = collectionId.replace(/^drop-/, "");
    const product = await getSneakerByStyleId(styleId);
    if (product) return [productToItem(product)];
    const fromSearch = await searchSneakers(styleId, 12);
    return fromSearch.map((p, i) => productToItem(p, i));
  },

  async getEntityTopItems(entityId, { limit = 50 } = {}) {
    const brand = entityId.replace(/^brand-/, "").replace(/-/g, " ");
    const products = await searchSneakers(brand, limit);
    const filtered = products.filter(
      (p) => p.brand?.toLowerCase().includes(brand.toLowerCase()) || brand.length < 3,
    );
    return (filtered.length ? filtered : products)
      .slice(0, limit)
      .map((p, i) => productToItem(p, i));
  },

  async getEntityById(entityId) {
    const brand = entityId.replace(/^brand-/, "").replace(/-/g, " ");
    if (!brand) return null;
    const products = await searchSneakers(brand, 5);
    const match = products.find((p) =>
      p.brand?.toLowerCase().includes(brand.toLowerCase()),
    );
    return brandToEntity(match?.brand ?? brand, match ?? products[0]);
  },

  async getEntityCollections(_entityId, _options) {
    return [];
  },
};
