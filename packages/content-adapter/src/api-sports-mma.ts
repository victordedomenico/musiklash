import type {
  ContentCollection,
  ContentEntity,
  ContentItem,
  ContentSource,
} from "./types";

const MMA_BASE = "https://v1.mma.api-sports.io";
const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";

// ─── Raw API-Sports MMA types (subset) ───────────────────────────────────────

export type MmaFighterRef = {
  id: number;
  name: string;
  logo?: string | null;
  winner?: boolean;
};

export type MmaFight = {
  id: number;
  date: string;
  time?: string;
  slug?: string;
  is_main?: boolean;
  category?: string;
  status?: { long?: string; short?: string };
  fighters?: {
    first?: MmaFighterRef;
    second?: MmaFighterRef;
  };
};

export type MmaFighter = {
  id: number;
  name: string;
  photo?: string | null;
  category?: string | null;
  team?: { id?: number; name?: string | null } | null;
  nationality?: string | null;
};

export type MmaCategory = {
  id?: number;
  name: string;
};

export type MmaTeam = {
  id: number;
  name: string;
};

type ApiSportsResponse<T> = {
  response?: T[];
  errors?: Record<string, string> | string[];
  results?: number;
};

// ─── Fetch ────────────────────────────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.API_SPORTS_KEY?.trim();
  if (!key) {
    throw new Error("API_SPORTS_KEY is not configured");
  }
  return key;
}

async function mmaGet<T>(
  path: string,
  params: Record<string, string> = {},
): Promise<T[]> {
  const url = new URL(`${MMA_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "x-apisports-key": getApiKey(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    next: { revalidate: 3600 } as any,
  });

  if (!res.ok) {
    throw new Error(`API-Sports MMA ${path} → ${res.status}`);
  }

  const json = (await res.json()) as ApiSportsResponse<T>;
  return Array.isArray(json.response) ? json.response : [];
}

function formatDate(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return undefined;
  }
}

function coverFromUrl(url?: string | null): string | undefined {
  return url?.trim() || undefined;
}

function fightTitle(f: MmaFight): string {
  const a = f.fighters?.first?.name;
  const b = f.fighters?.second?.name;
  if (a && b) return `${a} vs ${b}`;
  return f.slug?.trim() || `Combat #${f.id}`;
}

function fightSubtitle(f: MmaFight): string | undefined {
  const parts: string[] = [];
  if (f.category) parts.push(f.category);
  const date = formatDate(f.date);
  if (date) parts.push(date);
  const status = f.status?.long ?? f.status?.short;
  if (status) parts.push(status);
  if (f.is_main) parts.push("Main event");
  return parts.length ? parts.join(" · ") : undefined;
}

function parseEventSlug(slug?: string | null): string | undefined {
  if (!slug?.trim()) return undefined;
  const idx = slug.indexOf(":");
  return idx > 0 ? slug.slice(0, idx).trim() : slug.trim();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function wikipediaFighterPhoto(name: string): Promise<string | undefined> {
  const url = new URL(WIKIPEDIA_API);
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrsearch", `${name} MMA fighter`);
  url.searchParams.set("gsrlimit", "1");
  url.searchParams.set("prop", "pageimages");
  url.searchParams.set("piprop", "thumbnail");
  url.searchParams.set("pithumbsize", "300");

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json", "User-Agent": "FightKlash/1.0" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      next: { revalidate: 604_800 } as any,
    });
    if (!res.ok) return undefined;
    const json = (await res.json()) as {
      query?: { pages?: Record<string, { thumbnail?: { source?: string } }> };
    };
    const pages = json.query?.pages;
    if (!pages) return undefined;
    return Object.values(pages)[0]?.thumbnail?.source;
  } catch {
    return undefined;
  }
}

async function fighterPhoto(fighter: MmaFighter): Promise<string | undefined> {
  const direct = coverFromUrl(fighter.photo);
  if (direct) return direct;
  return wikipediaFighterPhoto(fighter.name);
}

function recentDates(count = 14): string[] {
  const dates: string[] = [];
  const d = new Date();
  for (let i = 0; i < count; i++) {
    dates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() - 1);
  }
  return dates;
}

// ─── Raw API ──────────────────────────────────────────────────────────────────

export async function searchFights(query: string, limit = 20): Promise<MmaFight[]> {
  const q = query.trim().toLowerCase();
  if (!q) return getTrendingFights(limit);

  const bySlug = await mmaGet<MmaFight>("/fights", { season: String(new Date().getFullYear()) });
  const slugMatches = bySlug.filter(
    (f) =>
      f.slug?.toLowerCase().includes(q) ||
      f.category?.toLowerCase().includes(q) ||
      f.fighters?.first?.name?.toLowerCase().includes(q) ||
      f.fighters?.second?.name?.toLowerCase().includes(q),
  );
  if (slugMatches.length > 0) return slugMatches.slice(0, limit);

  const fighters = await searchFighters(query, 5);
  if (fighters.length === 0) return [];
  const fights = (
    await Promise.all(fighters.slice(0, 3).map((f) => getFighterFights(f.id, limit)))
  ).flat();
  const seen = new Set<number>();
  const unique: MmaFight[] = [];
  for (const fight of fights) {
    if (seen.has(fight.id)) continue;
    seen.add(fight.id);
    unique.push(fight);
    if (unique.length >= limit) break;
  }
  return unique;
}

export async function searchFighters(query: string, limit = 20): Promise<MmaFighter[]> {
  if (!query.trim()) return [];
  return mmaGet<MmaFighter>("/fighters", {
    search: query.trim(),
  }).then((rows) => rows.slice(0, limit));
}

export async function searchCategories(query: string, limit = 20): Promise<MmaCategory[]> {
  const all = await mmaGet<MmaCategory>("/categories");
  const q = query.trim().toLowerCase();
  const filtered = q
    ? all.filter((c) => c.name.toLowerCase().includes(q))
    : all;
  return filtered.slice(0, limit);
}

export async function searchTeams(query: string, limit = 20): Promise<MmaTeam[]> {
  if (!query.trim()) return [];
  return mmaGet<MmaTeam>("/teams", {
    search: query.trim(),
  }).then((rows) => rows.slice(0, limit));
}

export async function getFighterById(id: string | number): Promise<MmaFighter | null> {
  const rows = await mmaGet<MmaFighter>("/fighters", { id: String(id) });
  return rows[0] ?? null;
}

export async function getFighterFights(fighterId: string | number, limit = 50): Promise<MmaFight[]> {
  return mmaGet<MmaFight>("/fights", {
    fighter: String(fighterId),
    season: String(new Date().getFullYear()),
  }).then((rows) => rows.slice(0, limit));
}

export async function getCategoryFights(category: string, limit = 50): Promise<MmaFight[]> {
  return mmaGet<MmaFight>("/fights", {
    category,
    season: String(new Date().getFullYear()),
  }).then((rows) => rows.slice(0, limit));
}

export async function getTrendingFights(limit = 18): Promise<MmaFight[]> {
  const dates = recentDates(21);
  const batches = await Promise.all(
    dates.slice(0, 7).map((date) => mmaGet<MmaFight>("/fights", { date })),
  );
  const seen = new Set<number>();
  const fights: MmaFight[] = [];
  for (const batch of batches) {
    for (const f of batch) {
      if (seen.has(f.id)) continue;
      seen.add(f.id);
      fights.push(f);
    }
  }
  fights.sort((a, b) => b.date.localeCompare(a.date));
  return fights.slice(0, limit);
}

async function listEventCollections(limit = 20): Promise<ContentCollection[]> {
  const fights = await getTrendingFights(80);
  const byEvent = new Map<string, ContentCollection>();
  for (const f of fights) {
    const event = parseEventSlug(f.slug);
    if (!event) continue;
    const id = `event-${slugify(event)}`;
    if (!byEvent.has(id)) {
      byEvent.set(id, {
        id,
        title: event,
        source: "api-sports",
        metadata: { collectionKind: "event", slug: f.slug },
      });
    }
  }
  return [...byEvent.values()].slice(0, limit);
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function fightToItem(f: MmaFight): ContentItem {
  const firstLogo = coverFromUrl(f.fighters?.first?.logo);
  const secondLogo = coverFromUrl(f.fighters?.second?.logo);
  return {
    id: String(f.id),
    title: fightTitle(f),
    subtitle: fightSubtitle(f),
    coverUrl: firstLogo ?? secondLogo,
    source: "api-sports",
    metadata: {
      itemKind: "fight",
      category: f.category,
      slug: f.slug,
      event: parseEventSlug(f.slug),
      status: f.status?.long,
      date: f.date,
      fighterIds: [f.fighters?.first?.id, f.fighters?.second?.id].filter(Boolean),
    },
  };
}

async function fighterToItem(f: MmaFighter): Promise<ContentItem> {
  const photo = await fighterPhoto(f);
  const recordParts: string[] = [];
  if (f.category) recordParts.push(f.category);
  if (f.nationality) recordParts.push(f.nationality);
  if (f.team?.name) recordParts.push(f.team.name);
  return {
    id: `fighter-${f.id}`,
    title: f.name,
    subtitle: recordParts.length ? recordParts.join(" · ") : "Fighter",
    coverUrl: photo,
    source: "api-sports",
    metadata: {
      itemKind: "fighter",
      fighterId: f.id,
      category: f.category,
      teamId: f.team?.id,
      teamName: f.team?.name,
    },
  };
}

function categoryToCollection(c: MmaCategory): ContentCollection {
  return {
    id: `style-${slugify(c.name)}`,
    title: c.name,
    source: "api-sports",
    metadata: { collectionKind: "style", category: c.name },
  };
}

function teamToEntity(t: MmaTeam): ContentEntity {
  return {
    id: `org-${t.id}`,
    name: t.name,
    source: "api-sports",
    metadata: { entityKind: "org", teamId: t.id },
  };
}

async function fighterToEntity(f: MmaFighter): Promise<ContentEntity> {
  return {
    id: String(f.id),
    name: f.name,
    pictureUrl: await fighterPhoto(f),
    source: "api-sports",
    metadata: {
      entityKind: "fighter",
      fighterId: f.id,
      category: f.category,
      teamName: f.team?.name,
    },
  };
}

function parseStyleId(collectionId: string): string | null {
  if (collectionId.startsWith("style-")) {
    return collectionId.slice("style-".length).replace(/-/g, " ");
  }
  return null;
}

function parseEventId(collectionId: string): string | null {
  if (!collectionId.startsWith("event-")) return null;
  return collectionId.slice("event-".length);
}

// ─── ContentSource ────────────────────────────────────────────────────────────

export const apiSportsMmaContentSource: ContentSource = {
  source: "api-sports",

  async searchItems(query, { limit = 20 } = {}) {
    const fights = await searchFights(query, limit);
    return fights.map(fightToItem);
  },

  async searchItemsByKind(kind, query, { limit = 20 } = {}) {
    if (kind === "fight" || kind === "match") {
      const fights = await searchFights(query, limit);
      return fights.map(fightToItem);
    }
    if (kind === "fighter") {
      const fighters = await searchFighters(query, limit);
      return Promise.all(fighters.map(fighterToItem));
    }
    if (kind === "style") {
      const categories = await searchCategories(query, limit);
      return categories.map((c) => ({
        id: `style-${slugify(c.name)}`,
        title: c.name,
        subtitle: "Catégorie de poids",
        source: "api-sports",
        metadata: { itemKind: "style", category: c.name },
      }));
    }
    return this.searchItems(query, { limit });
  },

  async searchCollections(query, { limit = 20 } = {}) {
    const q = query.trim().toLowerCase();
    const [styles, events] = await Promise.all([
      searchCategories(query, limit),
      listEventCollections(limit * 2),
    ]);
    const styleCols = styles.map(categoryToCollection);
    const eventCols = events.filter((e) =>
      q ? e.title.toLowerCase().includes(q) : true,
    );
    return [...eventCols, ...styleCols].slice(0, limit);
  },

  async searchEntities(query, { limit = 20 } = {}) {
    const half = Math.ceil(limit / 2);
    const [fighters, teams] = await Promise.all([
      searchFighters(query, half),
      searchTeams(query, half),
    ]);
    const fighterEntities = await Promise.all(fighters.map(fighterToEntity));
    return [...fighterEntities, ...teams.map(teamToEntity)].slice(0, limit);
  },

  async getCollectionItems(collectionId) {
    if (collectionId.startsWith("style-")) {
      const styleSlug = parseStyleId(collectionId);
      if (!styleSlug) return [];
      const categories = await mmaGet<MmaCategory>("/categories");
      const match = categories.find(
        (c) => slugify(c.name) === collectionId.slice("style-".length),
      );
      const categoryName = match?.name ?? styleSlug;
      const fights = await getCategoryFights(categoryName, 50);
      return fights.map(fightToItem);
    }

    if (collectionId.startsWith("event-")) {
      const eventSlug = parseEventId(collectionId);
      if (!eventSlug) return [];
      const fights = await mmaGet<MmaFight>("/fights", {
        season: String(new Date().getFullYear()),
      });
      return fights
        .filter((f) => slugify(parseEventSlug(f.slug) ?? "") === eventSlug)
        .map(fightToItem);
    }

    return [];
  },

  async getEntityTopItems(entityId, { limit = 50 } = {}) {
    const fighterId = entityId.startsWith("fighter-")
      ? entityId.replace(/^fighter-/, "")
      : entityId.startsWith("org-")
        ? null
        : entityId;
    if (!fighterId) return [];
    const fights = await getFighterFights(fighterId, limit);
    return fights.map(fightToItem);
  },

  async getEntityById(entityId) {
    if (entityId.startsWith("org-")) {
      const teamId = entityId.replace(/^org-/, "");
      const teams = await mmaGet<MmaTeam>("/teams", { id: teamId });
      const team = teams[0];
      return team ? teamToEntity(team) : null;
    }
    const fighterId = entityId.replace(/^fighter-/, "");
    const fighter = await getFighterById(fighterId);
    return fighter ? fighterToEntity(fighter) : null;
  },

  async getEntityCollections(_entityId) {
    const categories = await mmaGet<MmaCategory>("/categories");
    return categories.slice(0, 12).map(categoryToCollection);
  },
};
