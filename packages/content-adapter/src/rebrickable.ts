import type {
  ContentCollection,
  ContentEntity,
  ContentItem,
  ContentSource,
} from "./types";

const REBRICKABLE_BASE = "https://rebrickable.com/api/v3";

// ─── Raw Rebrickable types (subset) ───────────────────────────────────────────

export type RebrickableSet = {
  set_num: string;
  name: string;
  year?: number;
  theme_id?: number;
  num_parts?: number;
  set_img_url?: string | null;
  set_url?: string;
};

export type RebrickableTheme = {
  id: number;
  parent_id: number | null;
  name: string;
};

export type RebrickableMinifig = {
  set_num: string;
  name: string;
  num_parts?: number;
  set_img_url?: string | null;
  set_url?: string;
};

type RebrickablePaged<T> = {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: T[];
};

// ─── Fetch ────────────────────────────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.REBRICKABLE_API_KEY?.trim();
  if (!key) {
    throw new Error("REBRICKABLE_API_KEY is not configured");
  }
  return key;
}

async function rebrickableGet<T>(
  path: string,
  params: Record<string, string> = {},
  options?: { live?: boolean },
): Promise<T> {
  const url = new URL(`${REBRICKABLE_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      Authorization: `key ${getApiKey()}`,
    },
    ...(options?.live ? { cache: "no-store" as const } : {}),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(options?.live ? {} : ({ next: { revalidate: 3600 } } as any)),
  });

  if (!res.ok) {
    throw new Error(`Rebrickable ${path} → ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function setSubtitle(set: RebrickableSet): string | undefined {
  const parts: string[] = [];
  if (set.year) parts.push(String(set.year));
  if (set.num_parts) parts.push(`${set.num_parts} pièces`);
  if (set.set_num) parts.push(`#${set.set_num}`);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function minifigSubtitle(fig: RebrickableMinifig): string | undefined {
  const parts: string[] = ["Minifig"];
  if (fig.num_parts) parts.push(`${fig.num_parts} pièces`);
  if (fig.set_num) parts.push(fig.set_num);
  return parts.join(" · ");
}

// ─── Raw API (for routes / home trending) ─────────────────────────────────────

export async function searchSets(query: string, limit = 20): Promise<RebrickableSet[]> {
  if (!query.trim()) return [];
  const json = await rebrickableGet<RebrickablePaged<RebrickableSet>>("/lego/sets/", {
    search: query.trim(),
    page_size: String(Math.min(limit * 2, 40)),
    page: "1",
    ordering: "-num_parts",
    min_parts: "10", // exclude keychains, magnets and other gear (1-5 pieces)
  });
  // Secondary filter: exclude known non-set patterns in name
  const excluded = /keychain|porte-clef|magnet|pen |stylo|watch|montre|bag charm/i;
  return (json.results ?? [])
    .filter((s) => !excluded.test(s.name))
    .slice(0, limit);
}

export async function searchMinifigs(
  query: string,
  limit = 20,
): Promise<RebrickableMinifig[]> {
  if (!query.trim()) return [];
  const json = await rebrickableGet<RebrickablePaged<RebrickableMinifig>>("/lego/minifigs/", {
    search: query.trim(),
    page_size: String(Math.min(limit, 40)),
    page: "1",
  });
  return (json.results ?? []).slice(0, limit);
}

export async function searchThemes(query: string, limit = 20): Promise<RebrickableTheme[]> {
  if (!query.trim()) return [];
  const needle = query.trim().toLowerCase();
  const json = await rebrickableGet<RebrickablePaged<RebrickableTheme>>("/lego/themes/", {
    page_size: "1000",
    page: "1",
    ordering: "name",
  });
  return (json.results ?? [])
    .filter((t) => t.name.toLowerCase().includes(needle))
    .slice(0, limit);
}

export async function getSetByNum(setNum: string): Promise<RebrickableSet | null> {
  try {
    return await rebrickableGet<RebrickableSet>(`/lego/sets/${encodeURIComponent(setNum)}/`);
  } catch {
    return null;
  }
}

export async function getThemeById(themeId: string | number): Promise<RebrickableTheme | null> {
  try {
    return await rebrickableGet<RebrickableTheme>(`/lego/themes/${themeId}/`);
  } catch {
    return null;
  }
}

export async function getThemeSets(
  themeId: string | number,
  limit = 50,
): Promise<RebrickableSet[]> {
  const json = await rebrickableGet<RebrickablePaged<RebrickableSet>>("/lego/sets/", {
    theme_id: String(themeId),
    page_size: String(Math.min(limit * 2, 40)),
    page: "1",
    ordering: "-num_parts",
    min_parts: "10",
  });
  const excluded = /keychain|porte-clef|magnet|pen |stylo|watch|montre|bag charm/i;
  return (json.results ?? []).filter((s) => !excluded.test(s.name)).slice(0, limit);
}

export async function getTrendingSets(limit = 18): Promise<RebrickableSet[]> {
  const json = await rebrickableGet<RebrickablePaged<RebrickableSet>>("/lego/sets/", {
    page_size: String(Math.min(limit * 2, 40)),
    page: "1",
    ordering: "-num_parts",
    min_year: "2022",
    min_parts: "50", // trending = real sets, no polybags
  });
  return (json.results ?? []).slice(0, limit);
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function setToItem(set: RebrickableSet): ContentItem {
  return {
    id: set.set_num,
    title: set.name,
    subtitle: setSubtitle(set),
    coverUrl: set.set_img_url ?? undefined,
    source: "rebrickable",
    metadata: {
      itemKind: "set",
      setNum: set.set_num,
      year: set.year,
      themeId: set.theme_id,
      numParts: set.num_parts,
    },
  };
}

function minifigToItem(fig: RebrickableMinifig): ContentItem {
  return {
    id: `minifig-${fig.set_num}`,
    title: fig.name,
    subtitle: minifigSubtitle(fig),
    coverUrl: fig.set_img_url ?? undefined,
    source: "rebrickable",
    metadata: {
      itemKind: "minifig",
      minifigNum: fig.set_num,
      numParts: fig.num_parts,
    },
  };
}

function themeToEntity(theme: RebrickableTheme): ContentEntity {
  return {
    id: String(theme.id),
    name: theme.name,
    source: "rebrickable",
    metadata: { entityKind: "licence", parentId: theme.parent_id },
  };
}

function themeToCollection(theme: RebrickableTheme): ContentCollection {
  return {
    id: String(theme.id),
    title: theme.name,
    source: "rebrickable",
    metadata: { collectionKind: "licence", themeId: theme.id },
  };
}

// ─── ContentSource ────────────────────────────────────────────────────────────

export const rebrickableContentSource: ContentSource = {
  source: "rebrickable",

  async searchItems(query, { limit = 20 } = {}) {
    const sets = await searchSets(query, limit);
    return sets.map(setToItem);
  },

  async searchItemsByKind(kind, query, { limit = 20 } = {}) {
    if (kind === "minifig" || kind === "minifigs") {
      const figs = await searchMinifigs(query, limit);
      return figs.map(minifigToItem);
    }
    if (kind === "set" || kind === "sets") {
      return this.searchItems(query, { limit });
    }
    return this.searchItems(query, { limit });
  },

  async searchCollections(query, { limit = 20 } = {}) {
    const themes = await searchThemes(query, limit);
    return themes.map(themeToCollection);
  },

  async searchEntities(query, { limit = 20 } = {}) {
    const themes = await searchThemes(query, limit);
    return themes.map(themeToEntity);
  },

  async getCollectionItems(collectionId) {
    const sets = await getThemeSets(collectionId);
    return sets.map(setToItem);
  },

  async getEntityTopItems(entityId, { limit = 50 } = {}) {
    const sets = await getThemeSets(entityId, limit);
    return sets.map(setToItem);
  },

  async getEntityById(entityId) {
    const theme = await getThemeById(entityId);
    return theme ? themeToEntity(theme) : null;
  },

  async getEntityCollections(_entityId, _options) {
    return [];
  },
};
