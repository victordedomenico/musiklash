import type {
  ContentCollection,
  ContentEntity,
  ContentItem,
  ContentSource,
} from "./types";

const MEALDB_BASE = "https://www.themealdb.com/api/json/v1/1";

// ─── Raw TheMealDB types (subset) ─────────────────────────────────────────────

type MealSummary = {
  idMeal: string;
  strMeal: string;
  strMealThumb?: string;
  strCategory?: string;
  strArea?: string;
};

type MealFull = MealSummary & {
  strInstructions?: string;
  strTags?: string;
  strYoutube?: string;
  strSource?: string;
  [key: `strIngredient${number}`]: string | null | undefined;
};

type MealListEntry = { strCategory?: string; strArea?: string };

type MealDbResponse<T> = { meals: T[] | null };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function categoryId(name: string): string {
  return `category-${name}`;
}

function areaId(name: string): string {
  return `area-${name}`;
}

function parseCategoryId(collectionId: string): string {
  return collectionId.replace(/^category-/, "");
}

function parseAreaId(entityId: string): string {
  return entityId.replace(/^area-/, "");
}

async function mealDbFetch<T>(
  path: string,
  params: Record<string, string> = {},
  options?: { live?: boolean },
): Promise<T> {
  const url = new URL(`${MEALDB_BASE}/${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    ...(options?.live ? { cache: "no-store" as const } : {}),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(options?.live ? {} : ({ next: { revalidate: 3600 } } as any)),
  });

  if (!res.ok) {
    throw new Error(`TheMealDB ${path} → ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function mealToItem(meal: MealSummary | MealFull): ContentItem {
  return {
    id: meal.idMeal,
    title: meal.strMeal,
    subtitle: [meal.strArea, meal.strCategory].filter(Boolean).join(" · ") || undefined,
    coverUrl: meal.strMealThumb || undefined,
    source: "themealdb",
    metadata: {
      itemKind: "meal",
      category: meal.strCategory,
      area: meal.strArea,
    },
  };
}

function categoryToCollection(entry: MealListEntry): ContentCollection {
  const name = entry.strCategory ?? "";
  return {
    id: categoryId(name),
    title: name,
    source: "themealdb",
    metadata: { itemKind: "category" },
  };
}

function areaToEntity(entry: MealListEntry): ContentEntity {
  const name = entry.strArea ?? "";
  return {
    id: areaId(name),
    name,
    source: "themealdb",
    metadata: { itemKind: "cuisine" },
  };
}

// ─── Raw API (for routes / home trending) ─────────────────────────────────────

export async function searchMeals(query: string, limit = 20): Promise<MealSummary[]> {
  if (!query.trim()) return [];
  const json = await mealDbFetch<MealDbResponse<MealFull>>("search.php", {
    s: query.trim(),
  });
  return (json.meals ?? []).slice(0, limit);
}

export async function listCategories(): Promise<MealListEntry[]> {
  const json = await mealDbFetch<MealDbResponse<MealListEntry>>("list.php", { c: "list" });
  return json.meals ?? [];
}

export async function listAreas(): Promise<MealListEntry[]> {
  const json = await mealDbFetch<MealDbResponse<MealListEntry>>("list.php", { a: "list" });
  return json.meals ?? [];
}

export async function filterByCategory(category: string, limit = 50): Promise<MealSummary[]> {
  const json = await mealDbFetch<MealDbResponse<MealSummary>>("filter.php", { c: category });
  return (json.meals ?? []).slice(0, limit);
}

export async function filterByArea(area: string, limit = 50): Promise<MealSummary[]> {
  const json = await mealDbFetch<MealDbResponse<MealSummary>>("filter.php", { a: area });
  return (json.meals ?? []).slice(0, limit);
}

export async function filterByIngredient(ingredient: string, limit = 50): Promise<MealSummary[]> {
  const json = await mealDbFetch<MealDbResponse<MealSummary>>("filter.php", {
    i: ingredient.trim(),
  });
  return (json.meals ?? []).slice(0, limit);
}

export async function getMealById(mealId: string): Promise<MealFull | null> {
  const json = await mealDbFetch<MealDbResponse<MealFull>>("lookup.php", { i: mealId });
  return json.meals?.[0] ?? null;
}

export async function getRandomMeals(count = 1): Promise<MealSummary[]> {
  const n = Math.min(Math.max(count, 1), 10);
  const batches = await Promise.all(
    Array.from({ length: n }, () =>
      mealDbFetch<MealDbResponse<MealFull>>("random.php"),
    ),
  );
  const seen = new Set<string>();
  const meals: MealSummary[] = [];
  for (const json of batches) {
    const meal = json.meals?.[0];
    if (meal && !seen.has(meal.idMeal)) {
      seen.add(meal.idMeal);
      meals.push(meal);
    }
  }
  return meals;
}

export async function getTrendingMeals(limit = 18): Promise<MealSummary[]> {
  const categories = ["Chicken", "Pasta", "Seafood", "Dessert", "Beef", "Vegetarian"];
  const batches = await Promise.all(categories.map((c) => filterByCategory(c, 4)));
  const seen = new Set<string>();
  const meals: MealSummary[] = [];
  for (const batch of batches) {
    for (const meal of batch) {
      if (!seen.has(meal.idMeal)) {
        seen.add(meal.idMeal);
        meals.push(meal);
        if (meals.length >= limit) return meals;
      }
    }
  }
  if (meals.length < limit) {
    const random = await getRandomMeals(limit - meals.length);
    for (const meal of random) {
      if (!seen.has(meal.idMeal)) {
        seen.add(meal.idMeal);
        meals.push(meal);
        if (meals.length >= limit) break;
      }
    }
  }
  return meals;
}

// ─── ContentSource ────────────────────────────────────────────────────────────

export const themealdbContentSource: ContentSource = {
  source: "themealdb",

  async searchItems(query, { limit = 20 } = {}) {
    const meals = await searchMeals(query, limit);
    return meals.map(mealToItem);
  },

  async searchItemsByKind(kind, query, { limit = 20 } = {}) {
    if (kind === "meal") return this.searchItems(query, { limit });
    if (kind === "category") {
      const categories = await listCategories();
      const q = query.trim().toLowerCase();
      return categories
        .filter((c) => !q || (c.strCategory ?? "").toLowerCase().includes(q))
        .slice(0, limit)
        .map((c) => ({
          id: categoryId(c.strCategory ?? ""),
          title: c.strCategory ?? "",
          subtitle: "Catégorie",
          source: "themealdb",
          metadata: { itemKind: "category" },
        }));
    }
    if (kind === "cuisine") {
      const areas = await listAreas();
      const q = query.trim().toLowerCase();
      return areas
        .filter((a) => !q || (a.strArea ?? "").toLowerCase().includes(q))
        .slice(0, limit)
        .map((a) => ({
          id: areaId(a.strArea ?? ""),
          title: a.strArea ?? "",
          subtitle: "Cuisine",
          source: "themealdb",
          metadata: { itemKind: "cuisine" },
        }));
    }
    if (kind === "ingredient") {
      const meals = await filterByIngredient(query, limit);
      return meals.map(mealToItem);
    }
    return this.searchItems(query, { limit });
  },

  async searchCollections(query, { limit = 20 } = {}) {
    const categories = await listCategories();
    const q = query.trim().toLowerCase();
    return categories
      .filter((c) => !q || (c.strCategory ?? "").toLowerCase().includes(q))
      .slice(0, limit)
      .map(categoryToCollection);
  },

  async searchEntities(query, { limit = 20 } = {}) {
    const areas = await listAreas();
    const q = query.trim().toLowerCase();
    return areas
      .filter((a) => !q || (a.strArea ?? "").toLowerCase().includes(q))
      .slice(0, limit)
      .map(areaToEntity);
  },

  async getCollectionItems(collectionId) {
    const category = parseCategoryId(collectionId);
    const meals = await filterByCategory(category, 50);
    return meals.map(mealToItem);
  },

  async getEntityTopItems(entityId, { limit = 50 } = {}) {
    const area = parseAreaId(entityId);
    const meals = await filterByArea(area, limit);
    return meals.map(mealToItem);
  },

  async getEntityById(entityId) {
    const area = parseAreaId(entityId);
    if (!area) return null;
    const areas = await listAreas();
    const found = areas.find((a) => a.strArea === area);
    return found ? areaToEntity(found) : { id: entityId, name: area, source: "themealdb" };
  },

  async getEntityCollections(_entityId, { limit = 20 } = {}) {
    void _entityId;
    const categories = await listCategories();
    return categories.slice(0, limit).map(categoryToCollection);
  },
};
