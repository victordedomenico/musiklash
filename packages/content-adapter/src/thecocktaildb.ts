import type {
  ContentCollection,
  ContentEntity,
  ContentItem,
  ContentSource,
} from "./types";

const TCDB_BASE = "https://www.thecocktaildb.com/api/json/v1/1";
const TCDB_USER_AGENT = "DrinkKlash/1.0 (+https://drinkklash.vercel.app)";

// ─── Raw TheCocktailDB types (subset) ────────────────────────────────────────

type TcdbDrinkFull = {
  idDrink?: string;
  strDrink?: string;
  strDrinkAlternate?: string | null;
  strCategory?: string | null;
  strAlcoholic?: string | null;
  strGlass?: string | null;
  strInstructions?: string | null;
  strDrinkThumb?: string | null;
  strTags?: string | null;
  strIngredient1?: string | null;
  strIngredient2?: string | null;
  strIngredient3?: string | null;
  strIngredient4?: string | null;
  strIngredient5?: string | null;
  strIngredient6?: string | null;
  strIngredient7?: string | null;
  strIngredient8?: string | null;
  strIngredient9?: string | null;
  strIngredient10?: string | null;
  strIngredient11?: string | null;
  strIngredient12?: string | null;
  strIngredient13?: string | null;
  strIngredient14?: string | null;
  strIngredient15?: string | null;
};

type TcdbDrinkLite = {
  idDrink?: string;
  strDrink?: string;
  strDrinkThumb?: string | null;
};

type TcdbListEntry = { strCategory?: string; strIngredient?: string };

type TcdbSearchResponse = { drinks?: TcdbDrinkFull[] | null };
type TcdbFilterResponse = { drinks?: TcdbDrinkLite[] | null };
type TcdbListResponse = { drinks?: TcdbListEntry[] | null };

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function tcdbFetch<T>(
  path: string,
  params: Record<string, string> = {},
  options?: { live?: boolean },
): Promise<T> {
  const url = new URL(`${TCDB_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json", "User-Agent": TCDB_USER_AGENT },
    ...(options?.live ? { cache: "no-store" as const } : {}),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(options?.live ? {} : ({ next: { revalidate: 3600 } } as any)),
  });

  if (!res.ok) {
    throw new Error(`TheCocktailDB ${path} → ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function drinkIngredients(drink: TcdbDrinkFull): string[] {
  const keys = [
    drink.strIngredient1,
    drink.strIngredient2,
    drink.strIngredient3,
    drink.strIngredient4,
    drink.strIngredient5,
    drink.strIngredient6,
    drink.strIngredient7,
    drink.strIngredient8,
    drink.strIngredient9,
    drink.strIngredient10,
    drink.strIngredient11,
    drink.strIngredient12,
    drink.strIngredient13,
    drink.strIngredient14,
    drink.strIngredient15,
  ];
  return keys.filter((v): v is string => Boolean(v?.trim()));
}

function fullToItem(drink: TcdbDrinkFull): ContentItem {
  const ingredients = drinkIngredients(drink);
  return {
    id: drink.idDrink ?? "",
    title: drink.strDrink ?? "Sans titre",
    subtitle: drink.strCategory ?? drink.strAlcoholic ?? undefined,
    coverUrl: drink.strDrinkThumb ?? undefined,
    source: "thecocktaildb",
    metadata: {
      itemKind: "cocktail",
      category: drink.strCategory,
      alcoholic: drink.strAlcoholic,
      glass: drink.strGlass,
      tags: drink.strTags?.split(",").map((t) => t.trim()).filter(Boolean),
      ingredients,
    },
  };
}

function liteToItem(drink: TcdbDrinkLite): ContentItem {
  return {
    id: drink.idDrink ?? "",
    title: drink.strDrink ?? "Sans titre",
    coverUrl: drink.strDrinkThumb ?? undefined,
    source: "thecocktaildb",
    metadata: { itemKind: "cocktail" },
  };
}

function categoryToCollection(name: string): ContentCollection {
  return {
    id: `category-${encodeURIComponent(name)}`,
    title: name,
    source: "thecocktaildb",
    metadata: { itemKind: "category" },
  };
}

function ingredientToEntity(name: string): ContentEntity {
  return {
    id: `ingredient-${encodeURIComponent(name)}`,
    name,
    source: "thecocktaildb",
    metadata: { itemKind: "ingredient" },
  };
}

function decodeCollectionId(collectionId: string): string {
  return decodeURIComponent(collectionId.replace(/^category-/, ""));
}

function decodeEntityId(entityId: string): string {
  return decodeURIComponent(entityId.replace(/^ingredient-/, ""));
}

// ─── Raw API (for routes / home trending) ─────────────────────────────────────

export async function searchCocktails(query: string, limit = 20): Promise<TcdbDrinkFull[]> {
  if (!query.trim()) return [];
  const json = await tcdbFetch<TcdbSearchResponse>("/search.php", { s: query.trim() });
  return (json.drinks ?? []).slice(0, limit);
}

export async function searchCategories(query: string, limit = 20): Promise<string[]> {
  const json = await tcdbFetch<TcdbListResponse>("/list.php", { c: "list" });
  const all = (json.drinks ?? [])
    .map((d) => d.strCategory)
    .filter((c): c is string => Boolean(c));
  const q = query.trim().toLowerCase();
  const filtered = q ? all.filter((c) => c.toLowerCase().includes(q)) : all;
  return filtered.slice(0, limit);
}

export async function searchIngredients(query: string, limit = 20): Promise<string[]> {
  const json = await tcdbFetch<TcdbListResponse>("/list.php", { i: "list" });
  const all = (json.drinks ?? [])
    .map((d) => d.strIngredient)
    .filter((i): i is string => Boolean(i));
  const q = query.trim().toLowerCase();
  const filtered = q ? all.filter((i) => i.toLowerCase().includes(q)) : all;
  return filtered.slice(0, limit);
}

export async function getCocktailsByCategory(category: string, limit = 50): Promise<TcdbDrinkLite[]> {
  const json = await tcdbFetch<TcdbFilterResponse>("/filter.php", { c: category });
  return (json.drinks ?? []).slice(0, limit);
}

export async function getCocktailsByIngredient(ingredient: string, limit = 50): Promise<TcdbDrinkLite[]> {
  const json = await tcdbFetch<TcdbFilterResponse>("/filter.php", { i: ingredient });
  return (json.drinks ?? []).slice(0, limit);
}

export async function getCocktailById(id: string): Promise<TcdbDrinkFull | null> {
  try {
    const json = await tcdbFetch<TcdbSearchResponse>("/lookup.php", { i: id });
    return json.drinks?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function getTrendingCocktails(limit = 18): Promise<TcdbDrinkFull[]> {
  const drinks: TcdbDrinkFull[] = [];
  const seen = new Set<string>();
  const attempts = Math.min(limit * 2, 36);

  for (let i = 0; i < attempts && drinks.length < limit; i++) {
    try {
      const json = await tcdbFetch<TcdbSearchResponse>("/random.php", {}, { live: true });
      const drink = json.drinks?.[0];
      if (drink?.idDrink && !seen.has(drink.idDrink)) {
        seen.add(drink.idDrink);
        drinks.push(drink);
      }
    } catch {
      // ignore individual random failures
    }
  }

  return drinks;
}

// ─── ContentSource ────────────────────────────────────────────────────────────

export const theCocktailDbContentSource: ContentSource = {
  source: "thecocktaildb",

  async searchItems(query, { limit = 20 } = {}) {
    const drinks = await searchCocktails(query, limit);
    return drinks.map(fullToItem).filter((d) => d.id);
  },

  async searchItemsByKind(kind, query, { limit = 20 } = {}) {
    if (kind === "cocktail" || kind === "drink") {
      return this.searchItems(query, { limit });
    }
    if (kind === "category") {
      const categories = await searchCategories(query, limit);
      return categories.map((name) => ({
        id: `category-${encodeURIComponent(name)}`,
        title: name,
        subtitle: "Catégorie",
        source: "thecocktaildb",
        metadata: { itemKind: "category" },
      }));
    }
    if (kind === "ingredient") {
      const ingredients = await searchIngredients(query, limit);
      return ingredients.map((name) => ({
        id: `ingredient-${encodeURIComponent(name)}`,
        title: name,
        subtitle: "Ingrédient",
        source: "thecocktaildb",
        metadata: { itemKind: "ingredient" },
      }));
    }
    return this.searchItems(query, { limit });
  },

  async searchCollections(query, { limit = 20 } = {}) {
    const categories = await searchCategories(query, limit);
    return categories.map(categoryToCollection);
  },

  async searchEntities(query, { limit = 20 } = {}) {
    const ingredients = await searchIngredients(query, limit);
    return ingredients.map(ingredientToEntity);
  },

  async getCollectionItems(collectionId) {
    const category = decodeCollectionId(collectionId);
    const drinks = await getCocktailsByCategory(category, 50);
    return drinks.map(liteToItem).filter((d) => d.id);
  },

  async getEntityTopItems(entityId, { limit = 50 } = {}) {
    const ingredient = decodeEntityId(entityId);
    const drinks = await getCocktailsByIngredient(ingredient, limit);
    return drinks.map(liteToItem).filter((d) => d.id);
  },

  async getEntityById(entityId) {
    const ingredient = decodeEntityId(entityId);
    if (!ingredient) return null;
    return ingredientToEntity(ingredient);
  },

  async getEntityCollections(entityId, { limit = 20 } = {}) {
    void entityId;
    void limit;
    return [];
  },
};
