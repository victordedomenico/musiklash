import type {
  ContentCollection,
  ContentEntity,
  ContentItem,
  ContentSource,
} from "./types";

const MEALDB_BASE = "https://www.themealdb.com/api/json/v1/1";
const MEALDB_IMG = "https://www.themealdb.com/images/ingredients";

// ─── Ingredient categories ────────────────────────────────────────────────────

// [french name, english name for TheMealDB image]
export const FOOD_FRUITS: [string, string][] = [
  ["Banane", "Banana"], ["Pomme", "Apple"], ["Poire", "Pear"], ["Orange", "Orange"],
  ["Fraise", "Strawberry"], ["Mangue", "Mango"], ["Ananas", "Pineapple"],
  ["Raisin", "Grapes"], ["Pastèque", "Watermelon"], ["Cerise", "Cherry"],
  ["Citron", "Lemon"], ["Citron vert", "Lime"], ["Pêche", "Peach"],
  ["Abricot", "Apricot"], ["Prune", "Plum"], ["Kiwi", "Kiwi"],
  ["Noix de coco", "Coconut"], ["Myrtille", "Blueberries"],
  ["Framboise", "Raspberries"], ["Mûre", "Blackberries"],
  ["Papaye", "Papaya"], ["Fruit de la passion", "Passion Fruit"],
  ["Grenade", "Pomegranate"], ["Figue", "Figs"], ["Melon", "Cantaloupe"],
  ["Pamplemousse", "Grapefruit"], ["Clémentine", "Clementine"],
  ["Avocat", "Avocado"], ["Datte", "Dates"], ["Mangoustan", "Lychee"],
];

export const FOOD_FISH: [string, string][] = [
  ["Saumon", "Salmon"], ["Thon", "Tuna"], ["Cabillaud", "Cod"],
  ["Crevettes", "Prawns"], ["Sardine", "Sardines"], ["Truite", "Trout"],
  ["Dorade", "Sea Bass"], ["Sole", "Sole"], ["Maquereau", "Mackerel"],
  ["Hareng", "Herring"], ["Anchois", "Anchovies"], ["Espadon", "Swordfish"],
  ["Homard", "Lobster"], ["Crabe", "Crab"], ["Moules", "Mussels"],
  ["Coquilles Saint-Jacques", "Scallops"], ["Calamars", "Squid"],
  ["Pieuvre", "Octopus"], ["Palourdes", "Clams"], ["Huîtres", "Oysters"],
  ["Tilapia", "Tilapia"], ["Bar", "Sea Bass"], ["Loup de mer", "Sea Bass"],
  ["Turbot", "Turbot"], ["Merlu", "Haddock"], ["Langoustine", "Crayfish"],
];

export const FOOD_MEATS: [string, string][] = [
  ["Bœuf", "Beef"], ["Agneau", "Lamb"], ["Porc", "Pork"],
  ["Poulet", "Chicken"], ["Dinde", "Turkey"], ["Canard", "Duck"],
  ["Veau", "Veal"], ["Lapin", "Rabbit"], ["Gibier", "Venison"],
  ["Cerf", "Venison"], ["Sanglier", "Pork"], ["Chèvre", "Goat"],
  ["Côtelettes", "Lamb Chops"], ["Bacon", "Bacon"], ["Jambon", "Ham"],
  ["Saucisse", "Sausages"], ["Lardons", "Bacon"], ["Steak", "Beef"],
  ["Côte de bœuf", "Beef"], ["Entrecôte", "Beef"], ["Filet mignon", "Pork"],
  ["Côte d'agneau", "Lamb"], ["Épaule d'agneau", "Lamb"],
  ["Poitrine de poulet", "Chicken Breast"], ["Cuisses de poulet", "Chicken Thighs"],
  ["Magret de canard", "Duck"], ["Andouillette", "Sausages"],
];

export const FOOD_VEGETABLES: [string, string][] = [
  ["Concombre", "Cucumber"], ["Aubergine", "Aubergines"], ["Tomate", "Tomatoes"],
  ["Carotte", "Carrots"], ["Pomme de terre", "Potatoes"], ["Oignon", "Onion"],
  ["Ail", "Garlic"], ["Épinards", "Spinach"], ["Brocoli", "Brocolli"],
  ["Chou-fleur", "Cauliflower"], ["Courgette", "Courgettes"], ["Poireau", "Leek"],
  ["Céleri", "Celery"], ["Champignon", "Mushrooms"], ["Poivron rouge", "Red Pepper"],
  ["Poivron vert", "Green Pepper"], ["Maïs", "Sweetcorn"], ["Laitue", "Lettuce"],
  ["Asperge", "Asparagus"], ["Artichaut", "Artichoke"], ["Citrouille", "Pumpkin"],
  ["Betterave", "Beetroot"], ["Radis", "Radishes"], ["Échalote", "Shallots"],
  ["Fenouil", "Fennel"], ["Chou", "Cabbage"], ["Haricots verts", "Green Beans"],
  ["Petit pois", "Peas"], ["Chou de Bruxelles", "Brussels Sprouts"],
  ["Courge butternut", "Butternut Squash"], ["Endive", "Chicory"],
];

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

function ingredientImageUrl(englishName: string): string {
  return `${MEALDB_IMG}/${encodeURIComponent(englishName)}-Small.png`;
}

export function ingredientToItem(frenchName: string, englishName: string, kind = "ingredient"): ContentItem {
  return {
    id: `ingr-${englishName.toLowerCase().replace(/\s+/g, "-")}`,
    title: frenchName,
    subtitle: undefined,
    coverUrl: ingredientImageUrl(englishName),
    source: "themealdb",
    metadata: { itemKind: kind, englishName },
  };
}

export async function searchFoodIngredients(query: string, limit = 20): Promise<ContentItem[]> {
  if (!query.trim()) return [];
  // Combine and search across fruits + vegetables + a general ingredient list
  const combined: [string, string][] = [...FOOD_FRUITS, ...FOOD_VEGETABLES];
  const q = query.trim().toLowerCase();
  const matches = combined.filter(
    ([fr, en]) => fr.toLowerCase().includes(q) || en.toLowerCase().includes(q),
  );
  if (matches.length > 0) {
    return matches.slice(0, limit).map(([fr, en]) => ingredientToItem(fr, en));
  }
  // Also try TheMealDB ingredient list for less common items
  try {
    const json = await mealDbFetch<{ meals: Array<{ strIngredient: string }> | null }>(
      "list.php", { i: "list" },
    );
    return (json.meals ?? [])
      .filter((i) => i.strIngredient.toLowerCase().includes(q))
      .slice(0, limit)
      .map((i) => ingredientToItem(i.strIngredient, i.strIngredient));
  } catch {
    return [];
  }
}

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
    if (kind === "food-ingredient") {
      return searchFoodIngredients(query, limit);
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
