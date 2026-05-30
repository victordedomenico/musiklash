import type { ContentItem } from "./types";

const OFF_BASE = "https://world.openfoodfacts.org";

// ─── Raw types ────────────────────────────────────────────────────────────────

type OffProduct = {
  id?: string;
  _id?: string;
  product_name?: string;
  product_name_fr?: string;
  brands?: string;
  image_url?: string;
  image_front_small_url?: string;
  image_small_url?: string;
  categories_tags?: string[];
  unique_scans_n?: number;
};

type OffSearchResponse = {
  count?: number;
  products?: OffProduct[];
};

// ─── Drink categories ─────────────────────────────────────────────────────────

export const DRINK_CATEGORIES: { slug: string; label: string; emoji: string }[] = [
  { slug: "en:colas",            label: "Colas",              emoji: "🥤" },
  { slug: "en:waters",           label: "Eaux",               emoji: "💧" },
  { slug: "en:sparkling-waters", label: "Eaux pétillantes",   emoji: "🫧" },
  { slug: "en:fruit-juices",     label: "Jus de fruits",      emoji: "🍊" },
  { slug: "en:nectars",          label: "Nectars",            emoji: "🍑" },
  { slug: "en:iced-teas",        label: "Ice Tea",            emoji: "🧊" },
  { slug: "en:lemonades",        label: "Limonades",          emoji: "🍋" },
  { slug: "en:energy-drinks",    label: "Boissons énergisantes", emoji: "⚡" },
  { slug: "en:sports-drinks",    label: "Boissons sportives", emoji: "🏃" },
  { slug: "en:fruit-drinks",     label: "Boissons aux fruits",emoji: "🍹" },
  { slug: "en:wines",            label: "Vins",               emoji: "🍷" },
  { slug: "en:beers",            label: "Bières",             emoji: "🍺" },
  { slug: "en:ciders",           label: "Cidres",             emoji: "🍎" },
  { slug: "fr:champagnes",       label: "Champagnes",         emoji: "🥂" },
  { slug: "en:coffees",          label: "Cafés",              emoji: "☕" },
  { slug: "en:teas",             label: "Thés",               emoji: "🍵" },
  { slug: "en:hot-chocolates",   label: "Chocolats chauds",   emoji: "🍫" },
  { slug: "en:syrups",           label: "Sirops",             emoji: "🍬" },
  { slug: "en:plant-milks",      label: "Laits végétaux",     emoji: "🌱" },
  { slug: "en:milk",             label: "Laits",              emoji: "🥛" },
];

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function offFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${OFF_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json", "User-Agent": "DrinkKlash/1.0" },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    next: { revalidate: 3600 } as any,
  });
  if (!res.ok) throw new Error(`OpenFoodFacts ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

const FIELDS = "id,_id,product_name,product_name_fr,brands,image_front_small_url,image_small_url,image_url,unique_scans_n";

// ─── Public API ───────────────────────────────────────────────────────────────

export async function searchDrinks(query: string, limit = 20): Promise<OffProduct[]> {
  if (!query.trim()) return [];
  try {
    const json = await offFetch<OffSearchResponse>("/cgi/search.pl", {
      search_terms: query.trim(),
      action: "process",
      json: "1",
      tagtype_0: "categories",
      tag_contains_0: "contains",
      tag_0: "en:beverages",
      sort_by: "unique_scans_n",
      page_size: String(Math.min(limit * 2, 40)),
      page: "1",
      lc: "fr",
      fields: FIELDS,
    });
    return (json.products ?? [])
      .filter((p) => (p.product_name_fr ?? p.product_name ?? "").trim())
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function getDrinksByCategory(categorySlug: string, limit = 24): Promise<OffProduct[]> {
  try {
    // Use the v2 search API with sort_by=unique_scans_n to get the most popular/well-known brands first
    const json = await offFetch<OffSearchResponse>("/api/v2/search", {
      categories_tags: categorySlug,
      sort_by: "unique_scans_n",
      page_size: String(Math.min(limit * 2, 48)),
      page: "1",
      lc: "fr",
      fields: FIELDS,
    });
    return (json.products ?? [])
      .filter((p) => (p.product_name_fr ?? p.product_name ?? "").trim())
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function getDrinksByBrand(brand: string, limit = 20): Promise<OffProduct[]> {
  try {
    const json = await offFetch<OffSearchResponse>("/api/v2/search", {
      brands_tags: brand.toLowerCase().replace(/\s+/g, "-"),
      categories_tags: "en:beverages",
      sort_by: "unique_scans_n",
      page_size: String(Math.min(limit * 2, 40)),
      page: "1",
      lc: "fr",
      fields: FIELDS,
    });
    return (json.products ?? [])
      .filter((p) => (p.product_name_fr ?? p.product_name ?? "").trim())
      .slice(0, limit);
  } catch {
    return [];
  }
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

export function offProductToItem(p: OffProduct, categoryLabel?: string): ContentItem {
  const id = p._id ?? p.id ?? "";
  const name = (p.product_name_fr ?? p.product_name ?? "").trim();
  const brand = p.brands?.split(",")[0]?.trim();
  const coverUrl = p.image_front_small_url ?? p.image_small_url ?? p.image_url;

  return {
    id: `off-${id}`,
    title: name,
    subtitle: [brand, categoryLabel]
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i)
      .join(" · ") || undefined,
    coverUrl: coverUrl?.replace(/^http:\/\//, "https://") ?? undefined,
    source: "openfoodfacts",
    metadata: {
      itemKind: "drink",
      productId: id,
      brand,
    },
  };
}
