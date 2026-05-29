import type {
  ContentCollection,
  ContentEntity,
  ContentItem,
  ContentSource,
} from "./types";

const WGER_BASE = process.env.WGER_API_BASE ?? "https://wger.de/api/v2";
const WGER_LANGUAGE = process.env.WGER_LANGUAGE ?? "2";

type WgerPaginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

type WgerTranslation = {
  id: number;
  name: string;
  description?: string;
  language: number;
  aliases?: { alias: string }[];
};

type WgerMuscle = {
  id: number;
  name: string;
  name_en?: string;
  image_url_main?: string;
  image_url_secondary?: string;
};

type WgerCategory = {
  id: number;
  name: string;
};

type WgerImage = {
  image?: string;
  is_main?: boolean;
};

type WgerExerciseInfo = {
  id: number;
  uuid: string;
  category: WgerCategory;
  muscles: WgerMuscle[];
  muscles_secondary: WgerMuscle[];
  equipment: { id: number; name: string }[];
  images: WgerImage[];
  translations: WgerTranslation[];
};

type WgerExerciseBase = {
  id: number;
  category: number;
  muscles: number[];
  muscles_secondary: number[];
};

const POPULAR_CATEGORY_IDS = [11, 9, 10, 8, 13, 12, 15, 14];

let cachedExerciseInfo: WgerExerciseInfo[] | null = null;
let cachedMuscles: WgerMuscle[] | null = null;
let cachedCategories: WgerCategory[] | null = null;

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function matchesText(text: string, query: string): boolean {
  const q = normalizeQuery(query);
  if (!q) return true;
  return text.toLowerCase().includes(q);
}

async function wgerFetch<T>(
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  const url = new URL(`${WGER_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    next: { revalidate: 86400 } as any,
  });
  if (!res.ok) throw new Error(`Wger ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

function exerciseName(info: WgerExerciseInfo): string {
  const fr = info.translations.find((t) => t.language === Number(WGER_LANGUAGE));
  const en = info.translations.find((t) => t.language === 1);
  const any = info.translations[0];
  return fr?.name ?? en?.name ?? any?.name ?? `Exercice #${info.id}`;
}

function exerciseSubtitle(info: WgerExerciseInfo): string | undefined {
  const muscles = info.muscles
    .map((m) => m.name_en || m.name)
    .slice(0, 2)
    .join(", ");
  const category = info.category?.name;
  const parts = [category, muscles].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function exerciseCoverUrl(info: WgerExerciseInfo): string | undefined {
  const main = info.images.find((img) => img.is_main && img.image);
  if (main?.image) return main.image.startsWith("http") ? main.image : `https://wger.de${main.image}`;
  const first = info.images.find((img) => img.image);
  if (first?.image) return first.image.startsWith("http") ? first.image : `https://wger.de${first.image}`;
  const muscle = info.muscles[0];
  return muscle?.image_url_main;
}

function exerciseToItem(info: WgerExerciseInfo): ContentItem {
  return {
    id: `exercise:${info.id}`,
    title: exerciseName(info),
    subtitle: exerciseSubtitle(info),
    coverUrl: exerciseCoverUrl(info),
    source: "wger",
    metadata: {
      itemKind: "exercise",
      exerciseId: info.id,
      categoryId: info.category?.id,
      categoryName: info.category?.name,
      muscleIds: info.muscles.map((m) => m.id),
    },
  };
}

function muscleToEntity(muscle: WgerMuscle, exerciseCount = 0): ContentEntity {
  return {
    id: `muscle:${muscle.id}`,
    name: muscle.name_en || muscle.name,
    pictureUrl: muscle.image_url_main,
    fanCount: exerciseCount,
    source: "wger",
    metadata: { entityKind: "muscle", muscleId: muscle.id },
  };
}

function categoryToCollection(category: WgerCategory, exerciseCount = 0): ContentCollection {
  return {
    id: `category:${category.id}`,
    title: category.name,
    source: "wger",
    metadata: {
      collectionKind: "program",
      categoryId: category.id,
      exerciseCount,
    },
  };
}

function parseExerciseId(itemId: string): number | null {
  if (!itemId.startsWith("exercise:")) return null;
  const id = Number.parseInt(itemId.slice("exercise:".length), 10);
  return Number.isFinite(id) ? id : null;
}

function parseMuscleId(entityId: string): number | null {
  if (!entityId.startsWith("muscle:")) return null;
  const id = Number.parseInt(entityId.slice("muscle:".length), 10);
  return Number.isFinite(id) ? id : null;
}

function parseCategoryId(collectionId: string): number | null {
  if (!collectionId.startsWith("category:")) return null;
  const id = Number.parseInt(collectionId.slice("category:".length), 10);
  return Number.isFinite(id) ? id : null;
}

export async function loadAllExerciseInfo(): Promise<WgerExerciseInfo[]> {
  if (cachedExerciseInfo) return cachedExerciseInfo;
  const all: WgerExerciseInfo[] = [];
  let offset = 0;
  const pageSize = 100;
  while (true) {
    const page = await wgerFetch<WgerPaginated<WgerExerciseInfo>>("/exerciseinfo/", {
      language: WGER_LANGUAGE,
      limit: String(pageSize),
      offset: String(offset),
    });
    all.push(...page.results);
    if (!page.next || page.results.length === 0) break;
    offset += pageSize;
    if (offset >= page.count) break;
  }
  cachedExerciseInfo = all;
  return all;
}

async function getMusclesList(): Promise<WgerMuscle[]> {
  if (cachedMuscles) return cachedMuscles;
  const page = await wgerFetch<WgerPaginated<WgerMuscle>>("/muscle/", { limit: "50" });
  cachedMuscles = page.results;
  return cachedMuscles;
}

async function getCategoriesList(): Promise<WgerCategory[]> {
  if (cachedCategories) return cachedCategories;
  const page = await wgerFetch<WgerPaginated<WgerCategory>>("/exercisecategory/", { limit: "20" });
  cachedCategories = page.results;
  return cachedCategories;
}

function filterExerciseInfo(
  infos: WgerExerciseInfo[],
  query: string,
  limit: number,
): WgerExerciseInfo[] {
  const q = normalizeQuery(query);
  const filtered = q
    ? infos.filter((info) => {
        const name = exerciseName(info);
        if (matchesText(name, q)) return true;
        return info.translations.some(
          (t) =>
            matchesText(t.name, q) ||
            (t.aliases?.some((a) => matchesText(a.alias, q)) ?? false),
        );
      })
    : infos;
  return filtered.slice(0, limit);
}

async function exerciseInfoByIds(ids: number[]): Promise<ContentItem[]> {
  if (ids.length === 0) return [];
  const all = await loadAllExerciseInfo();
  const byId = new Map(all.map((info) => [info.id, info]));
  return ids
    .map((id) => byId.get(id))
    .filter((info): info is WgerExerciseInfo => info !== undefined)
    .map(exerciseToItem);
}

async function exerciseIdsForMuscle(muscleId: number, limit: number): Promise<number[]> {
  const page = await wgerFetch<WgerPaginated<WgerExerciseBase>>("/exercise/", {
    muscles: String(muscleId),
    limit: String(Math.min(limit, 50)),
  });
  return page.results.map((e) => e.id);
}

async function exerciseIdsForCategory(categoryId: number, limit: number): Promise<number[]> {
  const page = await wgerFetch<WgerPaginated<WgerExerciseBase>>("/exercise/", {
    category: String(categoryId),
    limit: String(Math.min(limit, 50)),
  });
  return page.results.map((e) => e.id);
}

export async function searchExercises(query: string, limit = 20): Promise<ContentItem[]> {
  const infos = await loadAllExerciseInfo();
  return filterExerciseInfo(infos, query, limit).map(exerciseToItem);
}

export async function searchMuscles(query: string, limit = 20): Promise<ContentEntity[]> {
  const muscles = await getMusclesList();
  const q = normalizeQuery(query);
  return muscles
    .filter((m) => !q || matchesText(m.name, q) || matchesText(m.name_en ?? "", q))
    .slice(0, limit)
    .map((m) => muscleToEntity(m));
}

export async function searchPrograms(query: string, limit = 20): Promise<ContentCollection[]> {
  const categories = await getCategoriesList();
  const q = normalizeQuery(query);
  return categories
    .filter((c) => !q || matchesText(c.name, q))
    .slice(0, limit)
    .map((c) => categoryToCollection(c));
}

export async function getMuscleExercises(muscleId: number, limit = 50): Promise<ContentItem[]> {
  const ids = await exerciseIdsForMuscle(muscleId, limit);
  return exerciseInfoByIds(ids);
}

export async function getCategoryExercises(categoryId: number, limit = 50): Promise<ContentItem[]> {
  const ids = await exerciseIdsForCategory(categoryId, limit);
  return exerciseInfoByIds(ids);
}

export async function getExerciseById(itemId: string): Promise<ContentItem | null> {
  const id = parseExerciseId(itemId);
  if (id === null) return null;
  const all = await loadAllExerciseInfo();
  const info = all.find((e) => e.id === id);
  return info ? exerciseToItem(info) : null;
}

export async function getTrendingExercises(limit = 18): Promise<ContentItem[]> {
  const items: ContentItem[] = [];
  const seen = new Set<number>();
  for (const categoryId of POPULAR_CATEGORY_IDS) {
    const ids = await exerciseIdsForCategory(categoryId, 4);
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      const [item] = await exerciseInfoByIds([id]);
      if (item) items.push(item);
      if (items.length >= limit) return items;
    }
  }
  if (items.length < limit) {
    const all = await loadAllExerciseInfo();
    for (const info of all) {
      if (seen.has(info.id)) continue;
      seen.add(info.id);
      items.push(exerciseToItem(info));
      if (items.length >= limit) break;
    }
  }
  return items;
}

export const wgerContentSource: ContentSource = {
  source: "wger",

  async searchItems(query, { limit = 20 } = {}) {
    return searchExercises(query, limit);
  },

  async searchItemsByKind(kind, query, { limit = 20 } = {}) {
    if (kind === "exercise") return searchExercises(query, limit);
    if (kind === "muscle") {
      const entities = await searchMuscles(query, limit);
      return entities.map((e) => ({
        id: e.id,
        title: e.name,
        subtitle: "Muscle",
        coverUrl: e.pictureUrl,
        source: "wger",
        metadata: { itemKind: "muscle", ...e.metadata },
      }));
    }
    if (kind === "program") {
      const collections = await searchPrograms(query, limit);
      return collections.map((c) => ({
        id: c.id,
        title: c.title,
        subtitle: "Programme",
        source: "wger",
        metadata: { itemKind: "program", ...c.metadata },
      }));
    }
    return searchExercises(query, limit);
  },

  async searchCollections(query, { limit = 20 } = {}) {
    return searchPrograms(query, limit);
  },

  async searchEntities(query, { limit = 20 } = {}) {
    return searchMuscles(query, limit);
  },

  async getCollectionItems(collectionId) {
    const categoryId = parseCategoryId(collectionId);
    if (categoryId === null) return [];
    return getCategoryExercises(categoryId);
  },

  async getEntityTopItems(entityId, { limit = 50 } = {}) {
    const muscleId = parseMuscleId(entityId);
    if (muscleId === null) return [];
    return getMuscleExercises(muscleId, limit);
  },

  async getEntityById(entityId) {
    const muscleId = parseMuscleId(entityId);
    if (muscleId === null) return null;
    const muscles = await getMusclesList();
    const muscle = muscles.find((m) => m.id === muscleId);
    if (!muscle) return null;
    const page = await wgerFetch<WgerPaginated<WgerExerciseBase>>("/exercise/", {
      muscles: String(muscleId),
      limit: "1",
    });
    return muscleToEntity(muscle, page.count);
  },

  async getEntityCollections(_entityId) {
    return [];
  },
};
