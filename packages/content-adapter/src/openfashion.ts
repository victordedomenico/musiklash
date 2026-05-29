import type {
  ContentCollection,
  ContentEntity,
  ContentItem,
  ContentSource,
} from "./types";

/** Livostyle Open Data (MIT) — catalogue mode femme, sync hebdomadaire. */
const OPEN_FASHION_BASE =
  "https://raw.githubusercontent.com/arturayupov/womens-fashion-catalog-open-data/main/data";
const WIKIMEDIA_API = "https://commons.wikimedia.org/w/api.php";

type OfImage = { url?: string; alt?: string; width?: number; height?: number };

type OfProduct = {
  id: string;
  handle: string;
  title: string;
  url?: string;
  product_type?: string;
  vendor?: string;
  tags?: string[];
  description_html?: string;
  category?: string;
  price?: number | string;
  featured_image_url?: string;
  images?: OfImage[];
  reviews?: { rating?: number; count?: number };
};

type OfCollection = {
  id: string;
  handle: string;
  title: string;
  url?: string;
  products_count?: number;
  image_url?: string;
  description_html?: string;
};

type CatalogCache = {
  products: OfProduct[];
  collections: OfCollection[];
  byVendor: Map<string, OfProduct[]>;
  byProductType: Map<string, OfProduct[]>;
  byCollectionHandle: Map<string, OfProduct[]>;
};

let catalogPromise: Promise<CatalogCache> | null = null;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function matchesQuery(text: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return text.toLowerCase().includes(q);
}

function productImageUrl(product: OfProduct): string | undefined {
  return (
    product.featured_image_url ??
    product.images?.[0]?.url ??
    undefined
  );
}

function productToItem(product: OfProduct): ContentItem {
  const price =
    typeof product.price === "number"
      ? product.price
      : typeof product.price === "string"
        ? Number.parseFloat(product.price)
        : undefined;
  const rating = product.reviews?.rating;
  return {
    id: product.id,
    title: product.title,
    subtitle: [product.vendor, product.product_type].filter(Boolean).join(" · ") || undefined,
    coverUrl: productImageUrl(product),
    source: "openfashion",
    metadata: {
      itemKind: "garment",
      handle: product.handle,
      vendor: product.vendor,
      productType: product.product_type,
      category: product.category,
      price,
      rating,
      url: product.url,
      tags: product.tags,
    },
  };
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${OPEN_FASHION_BASE}/${path}`, {
    headers: { Accept: "application/json", "User-Agent": "FashionKlash/1.0" },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    next: { revalidate: 86_400 } as any,
  });
  if (!res.ok) {
    throw new Error(`Open Fashion ${path} → ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function loadCatalog(): Promise<CatalogCache> {
  const [products, collections] = await Promise.all([
    fetchJson<OfProduct[]>("products.json"),
    fetchJson<OfCollection[]>("collections.json"),
  ]);

  const byVendor = new Map<string, OfProduct[]>();
  const byProductType = new Map<string, OfProduct[]>();
  const byCollectionHandle = new Map<string, OfProduct[]>();

  for (const product of products) {
    const vendor = product.vendor?.trim();
    if (vendor) {
      const list = byVendor.get(vendor) ?? [];
      list.push(product);
      byVendor.set(vendor, list);
    }
    const ptype = product.product_type?.trim();
    if (ptype) {
      const list = byProductType.get(ptype) ?? [];
      list.push(product);
      byProductType.set(ptype, list);
    }
    const tags = product.tags ?? [];
    for (const col of collections) {
      const handle = col.handle.toLowerCase();
      if (
        tags.some((t) => t.toLowerCase().includes(handle)) ||
        matchesQuery(product.title, col.title) ||
        matchesQuery(product.description_html ?? "", col.title)
      ) {
        const list = byCollectionHandle.get(col.handle) ?? [];
        list.push(product);
        byCollectionHandle.set(col.handle, list);
      }
    }
  }

  return { products, collections, byVendor, byProductType, byCollectionHandle };
}

function getCatalog(): Promise<CatalogCache> {
  catalogPromise ??= loadCatalog();
  return catalogPromise;
}

async function wikimediaBrandThumbnail(brandName: string): Promise<string | undefined> {
  const url = new URL(WIKIMEDIA_API);
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrsearch", `${brandName} fashion brand logo`);
  url.searchParams.set("gsrlimit", "1");
  url.searchParams.set("prop", "pageimages");
  url.searchParams.set("piprop", "thumbnail");
  url.searchParams.set("pithumbsize", "200");

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json", "User-Agent": "FashionKlash/1.0" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      next: { revalidate: 604_800 } as any,
    });
    if (!res.ok) return undefined;
    const json = (await res.json()) as {
      query?: { pages?: Record<string, { thumbnail?: { source?: string } }> };
    };
    const pages = json.query?.pages;
    if (!pages) return undefined;
    const first = Object.values(pages)[0];
    return first?.thumbnail?.source;
  } catch {
    return undefined;
  }
}

function collectionToContent(col: OfCollection): ContentCollection {
  return {
    id: `style-${col.handle}`,
    title: col.title,
    coverUrl: col.image_url,
    source: "openfashion",
    metadata: {
      itemKind: "style",
      handle: col.handle,
      productsCount: col.products_count,
      url: col.url,
    },
  };
}

function vendorToEntity(vendor: string, count: number): ContentEntity {
  return {
    id: `brand-${slugify(vendor)}`,
    name: vendor,
    fanCount: count,
    source: "openfashion",
    metadata: { itemKind: "brand", vendor },
  };
}

// ─── Raw API (home trending, routes) ─────────────────────────────────────────

export async function getTrendingGarments(limit = 18): Promise<ContentItem[]> {
  const { products } = await getCatalog();
  const ranked = [...products]
    .filter((p) => productImageUrl(p))
    .sort((a, b) => (b.reviews?.rating ?? 0) - (a.reviews?.rating ?? 0))
    .slice(0, limit);
  return ranked.map(productToItem);
}

export async function searchGarments(query: string, limit = 20): Promise<ContentItem[]> {
  const { products } = await getCatalog();
  const q = query.trim();
  if (!q) return [];
  const hits = products
    .filter(
      (p) =>
        matchesQuery(p.title, q) ||
        matchesQuery(p.vendor ?? "", q) ||
        matchesQuery(p.product_type ?? "", q) ||
        (p.tags ?? []).some((t) => matchesQuery(t, q)),
    )
    .slice(0, limit);
  return hits.map(productToItem);
}

// ─── ContentSource ────────────────────────────────────────────────────────────

export const openFashionContentSource: ContentSource = {
  source: "openfashion",

  async searchItems(query, { limit = 20 } = {}) {
    return searchGarments(query, limit);
  },

  async searchItemsByKind(kind, query, { limit = 20 } = {}) {
    const catalog = await getCatalog();
    const q = query.trim();
    if (!q) return [];

    if (kind === "garment") {
      return searchGarments(q, limit);
    }

    if (kind === "style") {
      const types = [...catalog.byProductType.keys()].filter((t) => matchesQuery(t, q));
      return types.slice(0, limit).map((t) => ({
        id: `style-type-${slugify(t)}`,
        title: t,
        subtitle: "Style",
        source: "openfashion",
        metadata: {
          itemKind: "style",
          productType: t,
          productsCount: catalog.byProductType.get(t)?.length,
        },
      }));
    }

    if (kind === "brand") {
      const vendors = [...catalog.byVendor.keys()].filter((v) => matchesQuery(v, q));
      return vendors.slice(0, limit).map((v) => ({
        id: `brand-${slugify(v)}`,
        title: v,
        subtitle: "Marque",
        source: "openfashion",
        metadata: {
          itemKind: "brand",
          vendor: v,
          productsCount: catalog.byVendor.get(v)?.length,
        },
      }));
    }

    if (kind === "creator") {
      const creators = new Set<string>();
      for (const p of catalog.products) {
        for (const tag of p.tags ?? []) {
          if (/knit|design|studio|label/i.test(tag) && matchesQuery(tag, q)) {
            creators.add(tag);
          }
        }
      }
      return [...creators].slice(0, limit).map((name) => ({
        id: `creator-${slugify(name)}`,
        title: name,
        subtitle: "Créateur",
        source: "openfashion",
        metadata: { itemKind: "creator", creator: name },
      }));
    }

    return searchGarments(q, limit);
  },

  async searchCollections(query, { limit = 20 } = {}) {
    const { collections, byProductType } = await getCatalog();
    const q = query.trim();
    if (!q) return [];

    const fromCollections = collections
      .filter((c) => matchesQuery(c.title, q) || matchesQuery(c.handle, q))
      .map(collectionToContent);

    const fromTypes = [...byProductType.keys()]
      .filter((t) => matchesQuery(t, q))
      .map(
        (t): ContentCollection => ({
          id: `style-type-${slugify(t)}`,
          title: t,
          source: "openfashion",
          metadata: {
            itemKind: "style",
            productType: t,
            productsCount: byProductType.get(t)?.length,
          },
        }),
      );

    const merged = [...fromCollections, ...fromTypes];
    const seen = new Set<string>();
    return merged.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    }).slice(0, limit);
  },

  async searchEntities(query, { limit = 20 } = {}) {
    const { byVendor } = await getCatalog();
    const q = query.trim();
    if (!q) return [];
    return [...byVendor.keys()]
      .filter((v) => matchesQuery(v, q))
      .slice(0, limit)
      .map((v) => vendorToEntity(v, byVendor.get(v)?.length ?? 0));
  },

  async getCollectionItems(collectionId) {
    const catalog = await getCatalog();

    if (collectionId.startsWith("style-type-")) {
      const slug = collectionId.replace(/^style-type-/, "");
      const type = [...catalog.byProductType.keys()].find((t) => slugify(t) === slug);
      return (catalog.byProductType.get(type ?? "") ?? []).slice(0, 50).map(productToItem);
    }

    const handle = collectionId.replace(/^style-/, "");
    const fromHandle = catalog.byCollectionHandle.get(handle);
    if (fromHandle?.length) {
      return fromHandle.slice(0, 50).map(productToItem);
    }

    const col = catalog.collections.find((c) => c.handle === handle);
    if (col) {
      return catalog.products
        .filter(
          (p) =>
            matchesQuery(p.title, col.title) ||
            (p.tags ?? []).some((t) => matchesQuery(t, col.handle)),
        )
        .slice(0, 50)
        .map(productToItem);
    }

    return [];
  },

  async getEntityTopItems(entityId, { limit = 50 } = {}) {
    const catalog = await getCatalog();

    if (entityId.startsWith("brand-")) {
      const slug = entityId.replace(/^brand-/, "");
      const vendor = [...catalog.byVendor.keys()].find((v) => slugify(v) === slug);
      return (catalog.byVendor.get(vendor ?? "") ?? []).slice(0, limit).map(productToItem);
    }

    if (entityId.startsWith("creator-")) {
      const slug = entityId.replace(/^creator-/, "");
      const hits = catalog.products.filter((p) =>
        (p.tags ?? []).some((t) => slugify(t) === slug),
      );
      return hits.slice(0, limit).map(productToItem);
    }

    return [];
  },

  async getEntityById(entityId) {
    const catalog = await getCatalog();

    if (entityId.startsWith("brand-")) {
      const slug = entityId.replace(/^brand-/, "");
      const vendor = [...catalog.byVendor.keys()].find((v) => slugify(v) === slug);
      if (!vendor) return null;
      const entity = vendorToEntity(vendor, catalog.byVendor.get(vendor)?.length ?? 0);
      const thumb = await wikimediaBrandThumbnail(vendor);
      if (thumb) entity.pictureUrl = thumb;
      return entity;
    }

    return null;
  },

  async getEntityCollections(entityId, { limit = 20 } = {}) {
    void entityId;
    void limit;
    return [];
  },
};
