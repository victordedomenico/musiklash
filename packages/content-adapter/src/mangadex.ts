import type {
  ContentCollection,
  ContentEntity,
  ContentItem,
  ContentSource,
} from "./types";
import { searchJikanCharacters, jikanCharToContentItem } from "./jikan";

const MD_BASE = "https://api.mangadex.org";
const COVER_CDN = "https://uploads.mangadex.org/covers";

const CONTENT_RATINGS = ["safe", "suggestive"] as const;
const CHAPTER_LANGS = ["fr", "en", "ja"];

// ─── MangaDex raw types (subset) ──────────────────────────────────────────────

type MdLocalized = Record<string, string | null | undefined>;

type MdRelationship = { id: string; type: string };

type MdEntity<T extends Record<string, unknown> = Record<string, unknown>> = {
  id: string;
  type: string;
  attributes: T;
  relationships?: MdRelationship[];
};

type MdMangaAttributes = {
  title: MdLocalized;
  altTitles?: Array<MdLocalized>;
  description?: MdLocalized;
  year?: number | null;
  status?: string;
  contentRating?: string;
  tags?: Array<{ attributes: { name: MdLocalized } }>;
};

type MdAuthorAttributes = {
  name: string;
};

type MdChapterAttributes = {
  title: string | null;
  chapter: string | null;
  volume: string | null;
  pages: number;
  readableAt?: string | null;
};

type MdCoverAttributes = {
  fileName: string;
};

type MdResponse<T> = {
  result: string;
  data: T;
  included?: MdEntity[];
  limit?: number;
  offset?: number;
  total?: number;
};

export type MdManga = MdEntity<MdMangaAttributes>;
export type MdAuthor = MdEntity<MdAuthorAttributes>;
export type MdChapter = MdEntity<MdChapterAttributes>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pickLocalized(map?: MdLocalized): string | undefined {
  if (!map) return undefined;
  for (const key of ["fr", "en", "ja-ro", "ja", "en-us"]) {
    const v = map[key];
    if (v?.trim()) return v.trim();
  }
  for (const v of Object.values(map)) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function buildIncludedMap(included?: MdEntity[]): Map<string, MdEntity> {
  return new Map((included ?? []).map((e) => [`${e.type}:${e.id}`, e]));
}

function coverFromManga(
  manga: MdManga,
  included: Map<string, MdEntity>,
  size: 256 | 512 = 256,
): string | undefined {
  const coverRel = manga.relationships?.find((r) => r.type === "cover_art");
  if (!coverRel) return undefined;
  const cover = included.get(`cover_art:${coverRel.id}`);
  const fileName = (cover?.attributes as MdCoverAttributes | undefined)?.fileName;
  if (!fileName) return undefined;
  return `${COVER_CDN}/${manga.id}/${fileName}.${size}.jpg`;
}

function mangaTitle(m: MdManga): string {
  return pickLocalized(m.attributes.title) ?? "Sans titre";
}

function mangaSubtitle(m: MdManga): string | undefined {
  const parts: string[] = [];
  if (m.attributes.year) parts.push(String(m.attributes.year));
  if (m.attributes.status) {
    const statusLabels: Record<string, string> = {
      ongoing: "En cours",
      completed: "Terminé",
      hiatus: "Pause",
      cancelled: "Annulé",
    };
    parts.push(statusLabels[m.attributes.status] ?? m.attributes.status);
  }
  return parts.length ? parts.join(" · ") : undefined;
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function mdGet<T>(
  path: string,
  params: Record<string, string | string[]> = {},
  options?: { live?: boolean },
): Promise<MdResponse<T>> {
  const url = new URL(`${MD_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) {
      for (const item of v) url.searchParams.append(k, item);
    } else {
      url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    ...(options?.live ? { cache: "no-store" as const } : {}),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(options?.live ? {} : ({ next: { revalidate: 3600 } } as any)),
  });

  if (!res.ok) {
    throw new Error(`MangaDex ${path} → ${res.status}`);
  }

  const json = (await res.json()) as MdResponse<T>;
  if (json.result !== "ok") {
    throw new Error(`MangaDex ${path} → ${json.result}`);
  }
  return json;
}

function ratingParams(): Record<string, string[]> {
  return { "contentRating[]": [...CONTENT_RATINGS] };
}

// ─── Raw API ──────────────────────────────────────────────────────────────────

export async function searchManga(query: string, limit = 20): Promise<MdManga[]> {
  if (!query.trim()) return [];
  const json = await mdGet<MdManga[]>("/manga", {
    title: query.trim(),
    limit: String(limit),
    "includes[]": ["cover_art", "author"],
    "order[relevance]": "desc",
    ...ratingParams(),
  });
  return json.data ?? [];
}

export async function searchAuthors(query: string, limit = 20): Promise<MdAuthor[]> {
  if (!query.trim()) return [];
  const json = await mdGet<MdAuthor[]>("/author", {
    name: query.trim(),
    limit: String(limit),
    "order[name]": "asc",
  });
  return json.data ?? [];
}

export async function getMangaById(mangaId: string): Promise<MdManga | null> {
  try {
    const json = await mdGet<MdManga>(`/manga/${mangaId}`, {
      "includes[]": ["cover_art", "author"],
    });
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function getMangaChapters(
  mangaId: string,
  limit = 100,
): Promise<MdChapter[]> {
  const json = await mdGet<MdChapter[]>(`/manga/${mangaId}/feed`, {
    limit: String(limit),
    "translatedLanguage[]": CHAPTER_LANGS,
    "order[chapter]": "asc",
    ...ratingParams(),
  });
  return json.data ?? [];
}

export async function getAuthorById(authorId: string): Promise<MdAuthor | null> {
  try {
    const json = await mdGet<MdAuthor>(`/author/${authorId}`);
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function getAuthorManga(authorId: string, limit = 50): Promise<MdManga[]> {
  const json = await mdGet<MdManga[]>("/manga", {
    "authors[]": [authorId],
    limit: String(limit),
    "includes[]": ["cover_art"],
    "order[followedCount]": "desc",
    ...ratingParams(),
  });
  return json.data ?? [];
}

export async function getPopularManga(limit = 18): Promise<MdManga[]> {
  const json = await mdGet<MdManga[]>("/manga", {
    limit: String(limit),
    "includes[]": ["cover_art"],
    "order[followedCount]": "desc",
    ...ratingParams(),
  });
  return json.data ?? [];
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mangaToItem(m: MdManga, included: Map<string, MdEntity>): ContentItem {
  return {
    id: m.id,
    title: mangaTitle(m),
    subtitle: mangaSubtitle(m),
    coverUrl: coverFromManga(m, included),
    source: "mangadex",
    metadata: {
      itemKind: "manga",
      year: m.attributes.year,
      status: m.attributes.status,
      contentRating: m.attributes.contentRating,
    },
  };
}

function mangaToCollection(m: MdManga, included: Map<string, MdEntity>): ContentCollection {
  return {
    id: m.id,
    title: mangaTitle(m),
    coverUrl: coverFromManga(m, included),
    source: "mangadex",
    metadata: {
      year: m.attributes.year,
      status: m.attributes.status,
    },
  };
}

function authorToEntity(a: MdAuthor): ContentEntity {
  return {
    id: a.id,
    name: a.attributes.name,
    source: "mangadex",
    metadata: { itemKind: "author" },
  };
}

function chapterToItem(ch: MdChapter, mangaTitleLabel?: string): ContentItem {
  const chNum = ch.attributes.chapter ?? "?";
  const vol = ch.attributes.volume ? `Vol. ${ch.attributes.volume} · ` : "";
  const label = ch.attributes.title?.trim() || `Chapitre ${chNum}`;
  return {
    id: ch.id,
    title: label,
    subtitle: mangaTitleLabel ? `${vol}Ch. ${chNum} · ${mangaTitleLabel}` : `${vol}Ch. ${chNum}`,
    source: "mangadex",
    metadata: {
      itemKind: "chapter",
      chapter: ch.attributes.chapter,
      volume: ch.attributes.volume,
      pages: ch.attributes.pages,
    },
  };
}

function mapMangaResults(data: MdManga[], included?: MdEntity[]) {
  const map = buildIncludedMap(included);
  return data.map((m) => mangaToItem(m, map));
}

function mapMangaCollections(data: MdManga[], included?: MdEntity[]) {
  const map = buildIncludedMap(included);
  return data.map((m) => mangaToCollection(m, map));
}

/** Popular manga mapped to ContentItem (covers resolved via `included`). */
export async function getPopularMangaItems(limit = 18): Promise<ContentItem[]> {
  const json = await mdGet<MdManga[]>("/manga", {
    limit: String(limit),
    "includes[]": ["cover_art"],
    "order[followedCount]": "desc",
    ...ratingParams(),
  });
  return mapMangaResults(json.data ?? [], json.included);
}

// ─── ContentSource ────────────────────────────────────────────────────────────

export const mangadexContentSource: ContentSource = {
  source: "mangadex",

  async searchItems(query, { limit = 20 } = {}) {
    if (!query.trim()) return [];
    const json = await mdGet<MdManga[]>("/manga", {
      title: query.trim(),
      limit: String(limit),
      "includes[]": ["cover_art"],
      "order[relevance]": "desc",
      ...ratingParams(),
    });
    return mapMangaResults(json.data ?? [], json.included);
  },

  async searchItemsByKind(kind, query, { limit = 20 } = {}) {
    if (kind === "manga" || kind === "movie") {
      return this.searchItems(query, { limit });
    }
    if (kind === "chapter") {
      const mangas = await searchManga(query, Math.min(limit, 5));
      const included = buildIncludedMap();
      const items: ContentItem[] = [];
      for (const m of mangas) {
        const title = mangaTitle(m);
        const chapters = await getMangaChapters(m.id, 20);
        items.push(...chapters.map((ch) => chapterToItem(ch, title)));
        if (items.length >= limit) break;
      }
      return items.slice(0, limit);
    }
    if (kind === "character") {
      const chars = await searchJikanCharacters(query, limit);
      return chars.map((c) => jikanCharToContentItem(c, "character"));
    }
    if (kind === "transformation") {
      const chars = await searchJikanCharacters(query, limit);
      return chars.map((c) => jikanCharToContentItem(c, "transformation"));
    }
    if (kind === "power") {
      const chars = await searchJikanCharacters(query, limit);
      return chars.map((c) => jikanCharToContentItem(c, "power"));
    }
    if (kind === "series") {
      const authors = await searchAuthors(query, limit);
      return authors.map((a) => ({
        id: `mseries-${a.id}`,
        title: a.attributes.name,
        subtitle: "Auteur/Série",
        source: "mangadex",
        metadata: { itemKind: "series", authorId: a.id },
      }));
    }
    if (kind === "arc") {
      // Free-text arcs for manga story arcs
      if (!query.trim()) return [];
      const slug = query.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      return [{
        id: `arc-free-${slug}`,
        title: query,
        subtitle: "Arc libre",
        source: "mangadex",
        metadata: { itemKind: "arc", arcName: query },
      }];
    }
    if (kind === "author" || kind === "person") {
      const authors = await searchAuthors(query, limit);
      return authors.map((a) => ({
        id: `author-${a.id}`,
        title: a.attributes.name,
        subtitle: "Auteur",
        source: "mangadex",
        metadata: { itemKind: "author", authorId: a.id },
      }));
    }
    return this.searchItems(query, { limit });
  },

  async searchCollections(query, { limit = 20 } = {}) {
    if (!query.trim()) return [];
    const json = await mdGet<MdManga[]>("/manga", {
      title: query.trim(),
      limit: String(limit),
      "includes[]": ["cover_art"],
      "order[relevance]": "desc",
      ...ratingParams(),
    });
    return mapMangaCollections(json.data ?? [], json.included);
  },

  async searchEntities(query, { limit = 20 } = {}) {
    if (!query.trim()) return [];
    const authors = await searchAuthors(query, limit);
    return authors.map(authorToEntity);
  },

  async getCollectionItems(collectionId) {
    const manga = await getMangaById(collectionId);
    const title = manga ? mangaTitle(manga) : undefined;
    const chapters = await getMangaChapters(collectionId, 100);
    return chapters.map((ch) => chapterToItem(ch, title));
  },

  async getEntityTopItems(entityId, { limit = 50 } = {}) {
    const json = await mdGet<MdManga[]>("/manga", {
      "authors[]": [entityId],
      limit: String(limit),
      "includes[]": ["cover_art"],
      "order[followedCount]": "desc",
      ...ratingParams(),
    });
    return mapMangaResults(json.data ?? [], json.included);
  },

  async getEntityById(entityId) {
    const author = await getAuthorById(entityId);
    return author ? authorToEntity(author) : null;
  },

  async getEntityCollections() {
    return [];
  },
};
