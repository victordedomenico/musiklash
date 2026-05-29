import type {
  ContentCollection,
  ContentEntity,
  ContentItem,
  ContentSource,
} from "./types";

const OL_BASE = "https://openlibrary.org";
const COVER_BASE = "https://covers.openlibrary.org";
const GB_BASE = "https://www.googleapis.com/books/v1";

// ─── Raw Open Library types (subset) ─────────────────────────────────────────

type OlSearchDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  edition_count?: number;
  series?: string[];
};

export type OlSeriesInfo = {
  name: string;
  author?: string;
  coverId?: number;
  bookCount: number;
};

type OlSearchResponse = { docs?: OlSearchDoc[] };

type OlAuthorDoc = {
  key?: string;
  name?: string;
  birth_date?: string;
  top_work?: string;
  work_count?: number;
};

type OlAuthorSearchResponse = { docs?: OlAuthorDoc[] };

type OlAuthor = {
  key?: string;
  name?: string;
  birth_date?: string;
  photos?: number[];
  work_count?: number;
};

type OlSubjectDoc = {
  key?: string;
  name?: string;
  work_count?: number;
};

type OlSubjectSearchResponse = { subjects?: OlSubjectDoc[] };

type OlWorkEntry = {
  key?: string;
  title?: string;
  authors?: { author?: { key?: string } }[];
  covers?: number[];
  first_publish_date?: string;
};

type OlWorksResponse = { entries?: OlWorkEntry[] };

type OlTrendingWork = {
  work?: { key?: string; title?: string };
  authors?: { author?: { key?: string; name?: string } }[];
  cover_id?: number;
  cover_edition_key?: string;
};

type OlTrendingResponse = { works?: OlTrendingWork[] };

type GbVolume = {
  id?: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    publishedDate?: string;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
  };
};

type GbSearchResponse = { items?: GbVolume[] };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function workIdFromKey(key?: string): string {
  if (!key) return "";
  return key.replace(/^\/works\//, "");
}

function authorIdFromKey(key?: string): string {
  if (!key) return "";
  return key.replace(/^\/authors\//, "");
}

function subjectSlugFromKey(key?: string): string {
  if (!key) return "";
  return key.replace(/^\/subjects\//, "");
}

function bookCoverUrl(coverId?: number): string | undefined {
  return coverId ? `${COVER_BASE}/b/id/${coverId}-M.jpg` : undefined;
}

function authorPhotoUrl(authorId: string, photoId?: number): string | undefined {
  if (photoId) return `${COVER_BASE}/a/id/${photoId}-M.jpg`;
  if (authorId) return `${COVER_BASE}/a/olid/${authorId}-M.jpg`;
  return undefined;
}

async function olFetch<T>(
  path: string,
  params: Record<string, string> = {},
  options?: { live?: boolean },
): Promise<T> {
  const url = new URL(path.startsWith("http") ? path : `${OL_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json", "User-Agent": "BookKlash/1.0" },
    ...(options?.live ? { cache: "no-store" as const } : {}),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(options?.live ? {} : ({ next: { revalidate: 3600 } } as any)),
  });

  if (!res.ok) {
    throw new Error(`Open Library ${path} → ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function gbFetchCover(title: string, author?: string): Promise<string | undefined> {
  const q = author ? `intitle:${title} inauthor:${author}` : `intitle:${title}`;
  const url = new URL(`${GB_BASE}/volumes`);
  url.searchParams.set("q", q);
  url.searchParams.set("maxResults", "1");
  url.searchParams.set("printType", "books");

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      next: { revalidate: 86400 } as any,
    });
    if (!res.ok) return undefined;
    const json = (await res.json()) as GbSearchResponse;
    const links = json.items?.[0]?.volumeInfo?.imageLinks;
    return links?.thumbnail?.replace("http:", "https:") ?? links?.smallThumbnail?.replace("http:", "https:");
  } catch {
    return undefined;
  }
}

async function resolveCover(
  title: string,
  coverId?: number,
  author?: string,
): Promise<string | undefined> {
  const olCover = bookCoverUrl(coverId);
  if (olCover) return olCover;
  return gbFetchCover(title, author);
}

// ─── Raw API (for routes / home trending) ─────────────────────────────────────

export async function searchBooks(query: string, limit = 20): Promise<OlSearchDoc[]> {
  if (!query.trim()) return [];
  const json = await olFetch<OlSearchResponse>("/search.json", {
    q: query.trim(),
    limit: String(limit),
    fields: "key,title,author_name,first_publish_year,cover_i,edition_count",
  });
  return json.docs ?? [];
}

export async function searchAuthors(query: string, limit = 20): Promise<OlAuthorDoc[]> {
  if (!query.trim()) return [];
  const json = await olFetch<OlAuthorSearchResponse>("/search/authors.json", {
    q: query.trim(),
    limit: String(limit),
  });
  return json.docs ?? [];
}

export async function searchSubjects(query: string, limit = 20): Promise<OlSubjectDoc[]> {
  if (!query.trim()) return [];
  const json = await olFetch<OlSubjectSearchResponse>("/search/subjects.json", {
    q: query.trim(),
    limit: String(limit),
  });
  return json.subjects ?? [];
}

export async function getAuthorById(authorId: string): Promise<OlAuthor | null> {
  const id = authorId.replace(/^\/authors\//, "");
  try {
    return await olFetch<OlAuthor>(`/authors/${id}.json`);
  } catch {
    return null;
  }
}

export async function getAuthorWorks(authorId: string, limit = 50): Promise<OlWorkEntry[]> {
  const id = authorId.replace(/^\/authors\//, "");
  const json = await olFetch<OlWorksResponse>(`/authors/${id}/works.json`, {
    limit: String(limit),
  });
  return json.entries ?? [];
}

export async function getSubjectWorks(subjectSlug: string, limit = 50): Promise<OlWorkEntry[]> {
  const slug = subjectSlug.replace(/^\/subjects\//, "");
  const json = await olFetch<{ works?: OlWorkEntry[] }>(`/subjects/${encodeURIComponent(slug)}.json`, {
    details: "true",
    limit: String(limit),
  });
  return json.works ?? [];
}

export async function getTrendingBooks(limit = 18): Promise<OlTrendingWork[]> {
  const json = await olFetch<OlTrendingResponse>("/trending/daily.json", {
    limit: String(limit),
  });
  return json.works ?? [];
}

/** Cherche des sagas/séries littéraires en extrayant le champ `series` des résultats OL. */
export async function searchBookSeries(query: string, limit = 20): Promise<OlSeriesInfo[]> {
  if (!query.trim()) return [];
  const json = await olFetch<{ docs?: OlSearchDoc[] }>("/search.json", {
    q: query.trim(),
    limit: String(limit * 4),
    fields: "key,title,series,cover_i,author_name",
  });
  const map = new Map<string, OlSeriesInfo>();
  for (const doc of json.docs ?? []) {
    for (const s of doc.series ?? []) {
      if (!map.has(s)) {
        map.set(s, {
          name: s,
          author: doc.author_name?.[0],
          coverId: doc.cover_i,
          bookCount: 1,
        });
      } else {
        map.get(s)!.bookCount++;
      }
    }
  }
  return [...map.values()].sort((a, b) => b.bookCount - a.bookCount).slice(0, limit);
}

/** Retourne les livres d'une saga, triés du plus ancien au plus récent. */
export async function getSeriesBooks(seriesName: string, limit = 25): Promise<OlSearchDoc[]> {
  const json = await olFetch<{ docs?: OlSearchDoc[] }>("/search.json", {
    q: `series:"${seriesName}"`,
    limit: String(limit),
    sort: "old",
    fields: "key,title,cover_i,author_name,first_publish_year",
  });
  return json.docs ?? [];
}

/** Recherche de livres via Google Books avec `langRestrict=fr` → titres en français. */
export async function gbSearchBooksFr(query: string, limit = 20): Promise<ContentItem[]> {
  if (!query.trim()) return [];
  try {
    const url = new URL(`${GB_BASE}/volumes`);
    url.searchParams.set("q", query.trim());
    url.searchParams.set("langRestrict", "fr");
    url.searchParams.set("maxResults", String(Math.min(limit, 40)));
    url.searchParams.set("orderBy", "relevance");
    url.searchParams.set("printType", "books");
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      next: { revalidate: 3600 } as any,
    });
    if (!res.ok) return [];
    const json = (await res.json()) as GbSearchResponse;
    return (json.items ?? []).flatMap((v) => {
      const info = v.volumeInfo;
      if (!info?.title) return [];
      const raw = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail;
      const coverUrl = raw?.replace(/^http:\/\//, "https://");
      return [{
        id: `gb-${v.id}`,
        title: info.title,
        subtitle: info.authors?.join(", "),
        coverUrl,
        source: "googlebooks",
        metadata: {
          itemKind: "book",
          year: info.publishedDate?.slice(0, 4),
          gbId: v.id,
        },
      } satisfies ContentItem];
    });
  } catch {
    return [];
  }
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

async function docToItem(doc: OlSearchDoc): Promise<ContentItem> {
  const id = workIdFromKey(doc.key);
  const author = doc.author_name?.[0];
  const coverUrl = await resolveCover(doc.title ?? "", doc.cover_i, author);
  return {
    id,
    title: doc.title ?? "Sans titre",
    subtitle: author ?? (doc.first_publish_year ? String(doc.first_publish_year) : undefined),
    coverUrl,
    source: "openlibrary",
    metadata: {
      itemKind: "book",
      authors: doc.author_name,
      firstPublishYear: doc.first_publish_year,
      coverId: doc.cover_i,
      editionCount: doc.edition_count,
    },
  };
}

async function workToItem(work: OlWorkEntry, authorNames?: string[]): Promise<ContentItem> {
  const id = workIdFromKey(work.key);
  const coverId = work.covers?.[0];
  const author = authorNames?.[0];
  const year = work.first_publish_date?.slice(0, 4);
  const coverUrl = await resolveCover(work.title ?? "", coverId, author);
  return {
    id,
    title: work.title ?? "Sans titre",
    subtitle: author ?? year,
    coverUrl,
    source: "openlibrary",
    metadata: {
      itemKind: "book",
      authors: authorNames,
      firstPublishYear: year ? Number(year) : undefined,
      coverId,
    },
  };
}

function subjectToCollection(s: OlSubjectDoc): ContentCollection {
  const slug = subjectSlugFromKey(s.key);
  return {
    id: slug,
    title: s.name ?? slug,
    source: "openlibrary",
    metadata: { itemKind: "genre", workCount: s.work_count },
  };
}

function authorToEntity(a: OlAuthorDoc | OlAuthor, idOverride?: string): ContentEntity {
  const id = idOverride ?? authorIdFromKey(a.key);
  return {
    id,
    name: a.name ?? "Auteur inconnu",
    pictureUrl: authorPhotoUrl(id),
    fanCount: "work_count" in a && a.work_count ? a.work_count : undefined,
    source: "openlibrary",
    metadata: {
      birthDate: "birth_date" in a ? a.birth_date : undefined,
      topWork: "top_work" in a ? a.top_work : undefined,
    },
  };
}

function trendingToItem(entry: OlTrendingWork): ContentItem {
  const id = workIdFromKey(entry.work?.key);
  const author = entry.authors?.[0]?.author?.name;
  return {
    id,
    title: entry.work?.title ?? "Sans titre",
    subtitle: author,
    coverUrl: bookCoverUrl(entry.cover_id),
    source: "openlibrary",
    metadata: { itemKind: "book", coverId: entry.cover_id },
  };
}

// ─── ContentSource ────────────────────────────────────────────────────────────

export const openLibraryContentSource: ContentSource = {
  source: "openlibrary",

  async searchItems(query, { limit = 20 } = {}) {
    const docs = await searchBooks(query, limit);
    return Promise.all(docs.map(docToItem));
  },

  async searchItemsByKind(kind, query, { limit = 20 } = {}) {
    if (kind === "book") {
      // Prefer French titles via Google Books
      const frResults = await gbSearchBooksFr(query, limit);
      if (frResults.length > 0) return frResults;
      return this.searchItems(query, { limit });
    }
    if (kind === "series") {
      const series = await searchBookSeries(query, limit);
      return series.map((s) => {
        const slug = s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        return {
          id: `bseries-${slug}`,
          title: s.name,
          subtitle: [
            s.author,
            s.bookCount > 1 ? `${s.bookCount} livres` : undefined,
          ].filter(Boolean).join(" · "),
          coverUrl: bookCoverUrl(s.coverId),
          source: "openlibrary",
          metadata: { itemKind: "series", seriesName: s.name, bookCount: s.bookCount },
        } satisfies ContentItem;
      });
    }
    if (kind === "series-books") {
      // query = series name; returns the books in that series
      const docs = await getSeriesBooks(query, limit);
      return Promise.all(docs.map(docToItem));
    }
    if (kind === "genre") {
      const subjects = await searchSubjects(query, limit);
      return subjects.map((s) => ({
        id: `genre-${subjectSlugFromKey(s.key)}`,
        title: s.name ?? subjectSlugFromKey(s.key),
        subtitle: "Genre",
        source: "openlibrary",
        metadata: { itemKind: "genre", workCount: s.work_count },
      }));
    }
    if (kind === "author") {
      const authors = await searchAuthors(query, limit);
      return authors.map((a) => ({
        id: authorIdFromKey(a.key),
        title: a.name ?? "Auteur",
        subtitle: a.top_work ?? (a.work_count ? `${a.work_count} œuvres` : undefined),
        coverUrl: authorPhotoUrl(authorIdFromKey(a.key)),
        source: "openlibrary",
        metadata: { itemKind: "author", workCount: a.work_count },
      }));
    }
    return this.searchItems(query, { limit });
  },

  async searchCollections(query, { limit = 20 } = {}) {
    const subjects = await searchSubjects(query, limit);
    return subjects.map(subjectToCollection);
  },

  async searchEntities(query, { limit = 20 } = {}) {
    const authors = await searchAuthors(query, limit);
    return authors.map((a) => authorToEntity(a));
  },

  async getCollectionItems(collectionId) {
    const slug = collectionId.replace(/^genre-/, "");
    const works = await getSubjectWorks(slug, 50);
    return Promise.all(works.map((w) => workToItem(w)));
  },

  async getEntityTopItems(entityId, { limit = 50 } = {}) {
    const works = await getAuthorWorks(entityId, limit);
    const author = await getAuthorById(entityId);
    const authorName = author?.name;
    return Promise.all(works.map((w) => workToItem(w, authorName ? [authorName] : undefined)));
  },

  async getEntityById(entityId) {
    const author = await getAuthorById(entityId);
    return author ? authorToEntity(author, entityId) : null;
  },

  async getEntityCollections(entityId, { limit = 20 } = {}) {
    void entityId;
    void limit;
    return [];
  },
};

export { trendingToItem };
