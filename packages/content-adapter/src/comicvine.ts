import type {
  ContentCollection,
  ContentEntity,
  ContentItem,
  ContentSource,
} from "./types";

const CV_BASE = "https://comicvine.gamespot.com/api";

// ─── Raw Comic Vine types (subset) ────────────────────────────────────────────

type CvImage = {
  icon_url?: string;
  medium_url?: string;
  screen_url?: string;
  thumb_url?: string;
  small_url?: string;
};

type CvIssue = {
  id: number | string;
  name?: string;
  issue_number?: string;
  cover_date?: string;
  image?: CvImage;
  volume?: { id?: number | string; name?: string };
};

type CvVolume = {
  id: number | string;
  name?: string;
  count_of_issues?: number;
  image?: CvImage;
  publisher?: { name?: string };
};

type CvCharacter = {
  id: number | string;
  name?: string;
  real_name?: string;
  image?: CvImage;
  count_of_issue_appearances?: number;
};

type CvStoryArc = {
  id: number | string;
  name?: string;
  image?: CvImage;
  count_of_issue_appearances?: number;
};

type CvSearchResult = {
  id: number | string;
  name?: string;
  issue_number?: string;
  cover_date?: string;
  image?: CvImage;
  volume?: { id?: number | string; name?: string };
  resource_type?: string;
};

type CvListResponse<T> = {
  status_code?: number;
  results?: T[];
  number_of_total_results?: number;
};

type CvDetailResponse<T> = {
  status_code?: number;
  results?: T;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.COMIC_VINE_API_KEY?.trim();
  if (!key) {
    throw new Error("COMIC_VINE_API_KEY is not configured");
  }
  return key;
}

function cvId(value: number | string | undefined): string {
  if (value == null) return "";
  return String(value);
}

function cvNumericId(id: string | number): string {
  const s = String(id);
  const dash = s.indexOf("-");
  return dash >= 0 ? s.slice(dash + 1) : s;
}

function imageUrl(image?: CvImage): string | undefined {
  return image?.medium_url ?? image?.screen_url ?? image?.small_url ?? image?.thumb_url;
}

function issueTitle(issue: CvIssue | CvSearchResult): string {
  const vol = issue.volume?.name;
  const num = issue.issue_number;
  const name = issue.name?.trim();
  if (name && name !== vol) return name;
  if (vol && num) return `${vol} #${num}`;
  if (vol) return vol;
  if (name) return name;
  return `Numéro ${cvNumericId(issue.id)}`;
}

function issueSubtitle(issue: CvIssue | CvSearchResult): string | undefined {
  const parts: string[] = [];
  if (issue.volume?.name && issue.issue_number) {
    parts.push(`${issue.volume.name} #${issue.issue_number}`);
  } else if (issue.issue_number) {
    parts.push(`#${issue.issue_number}`);
  }
  if (issue.cover_date) {
    parts.push(issue.cover_date.slice(0, 4));
  }
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

async function cvFetch<T>(
  path: string,
  params: Record<string, string> = {},
  options?: { live?: boolean },
): Promise<T> {
  const url = new URL(path.startsWith("http") ? path : `${CV_BASE}${path}`);
  url.searchParams.set("api_key", getApiKey());
  url.searchParams.set("format", "json");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json", "User-Agent": "ComicKlash/1.0" },
    ...(options?.live ? { cache: "no-store" as const } : {}),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(options?.live ? {} : ({ next: { revalidate: 3600 } } as any)),
  });

  if (!res.ok) {
    throw new Error(`Comic Vine ${path} → ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Raw API (for routes / home trending) ─────────────────────────────────────

export async function searchIssues(query: string, limit = 20): Promise<CvIssue[]> {
  if (!query.trim()) return [];
  const json = await cvFetch<CvListResponse<CvSearchResult>>("/search/", {
    query: query.trim(),
    resources: "issue",
    limit: String(Math.min(limit, 20)),
    field_list: "id,name,issue_number,cover_date,image,volume,resource_type",
  });
  return (json.results ?? []).filter((r) => r.resource_type === "issue").slice(0, limit);
}

export async function searchVolumes(query: string, limit = 20): Promise<CvVolume[]> {
  if (!query.trim()) return [];
  const json = await cvFetch<CvListResponse<CvSearchResult>>("/search/", {
    query: query.trim(),
    resources: "volume",
    limit: String(Math.min(limit, 20)),
    field_list: "id,name,image,resource_type",
  });
  return (json.results ?? [])
    .filter((r) => r.resource_type === "volume")
    .map((r) => ({ id: r.id, name: r.name, image: r.image }))
    .slice(0, limit);
}

export async function searchStoryArcs(query: string, limit = 20): Promise<CvStoryArc[]> {
  if (!query.trim()) return [];
  const json = await cvFetch<CvListResponse<CvSearchResult>>("/search/", {
    query: query.trim(),
    resources: "story_arc",
    limit: String(Math.min(limit, 20)),
    field_list: "id,name,image,resource_type",
  });
  return (json.results ?? [])
    .filter((r) => r.resource_type === "story_arc")
    .map((r) => ({ id: r.id, name: r.name, image: r.image }))
    .slice(0, limit);
}

export async function searchCharacters(query: string, limit = 20): Promise<CvCharacter[]> {
  if (!query.trim()) return [];
  const json = await cvFetch<CvListResponse<CvSearchResult>>("/search/", {
    query: query.trim(),
    resources: "character",
    limit: String(Math.min(limit, 20)),
    field_list: "id,name,image,resource_type",
  });
  return (json.results ?? [])
    .filter((r) => r.resource_type === "character")
    .map((r) => ({ id: r.id, name: r.name, image: r.image }))
    .slice(0, limit);
}

export async function getVolumeIssues(
  volumeId: string | number,
  limit = 100,
): Promise<CvIssue[]> {
  const json = await cvFetch<CvListResponse<CvIssue>>("/issues/", {
    filter: `volume:${cvNumericId(volumeId)}`,
    sort: "issue_number:asc",
    limit: String(Math.min(limit, 100)),
    field_list: "id,name,issue_number,cover_date,image,volume",
  });
  return json.results ?? [];
}

export async function getStoryArcIssues(
  arcId: string | number,
  limit = 100,
): Promise<CvIssue[]> {
  const json = await cvFetch<CvListResponse<CvIssue>>("/issues/", {
    filter: `story_arc:${cvNumericId(arcId)}`,
    sort: "issue_number:asc",
    limit: String(Math.min(limit, 100)),
    field_list: "id,name,issue_number,cover_date,image,volume",
  });
  return json.results ?? [];
}

export async function getCharacterIssues(
  characterId: string | number,
  limit = 50,
): Promise<CvIssue[]> {
  const json = await cvFetch<CvListResponse<CvIssue>>("/issues/", {
    filter: `character:${cvNumericId(characterId)}`,
    sort: "cover_date:desc",
    limit: String(Math.min(limit, 100)),
    field_list: "id,name,issue_number,cover_date,image,volume",
  });
  return json.results ?? [];
}

export async function getCharacterById(
  characterId: string | number,
): Promise<CvCharacter | null> {
  try {
    const json = await cvFetch<CvDetailResponse<CvCharacter>>(
      `/character/${cvNumericId(characterId)}/`,
      { field_list: "id,name,real_name,image,count_of_issue_appearances" },
    );
    return json.results ?? null;
  } catch {
    return null;
  }
}

export async function getRecentIssues(limit = 18): Promise<CvIssue[]> {
  const json = await cvFetch<CvListResponse<CvIssue>>("/issues/", {
    sort: "date_added:desc",
    limit: String(Math.min(limit, 20)),
    field_list: "id,name,issue_number,cover_date,image,volume",
  });
  return (json.results ?? []).slice(0, limit);
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function issueToItem(issue: CvIssue): ContentItem {
  return {
    id: cvId(issue.id),
    title: issueTitle(issue),
    subtitle: issueSubtitle(issue),
    coverUrl: imageUrl(issue.image),
    source: "comicvine",
    metadata: {
      itemKind: "issue",
      issueNumber: issue.issue_number,
      coverDate: issue.cover_date,
      volumeId: issue.volume?.id ? cvId(issue.volume.id) : undefined,
      volumeName: issue.volume?.name,
    },
  };
}

function volumeToCollection(volume: CvVolume): ContentCollection {
  return {
    id: cvId(volume.id),
    title: volume.name ?? "Série sans titre",
    coverUrl: imageUrl(volume.image),
    source: "comicvine",
    metadata: {
      collectionKind: "volume",
      issueCount: volume.count_of_issues,
      publisher: volume.publisher?.name,
    },
  };
}

function arcToCollection(arc: CvStoryArc): ContentCollection {
  return {
    id: `arc-${cvId(arc.id)}`,
    title: arc.name ?? "Arc sans titre",
    coverUrl: imageUrl(arc.image),
    source: "comicvine",
    metadata: {
      collectionKind: "story_arc",
      arcId: cvId(arc.id),
      issueCount: arc.count_of_issue_appearances,
    },
  };
}

function characterToEntity(character: CvCharacter): ContentEntity {
  return {
    id: cvId(character.id),
    name: character.name ?? "Personnage",
    pictureUrl: imageUrl(character.image),
    fanCount: character.count_of_issue_appearances,
    source: "comicvine",
    metadata: {
      realName: character.real_name,
    },
  };
}

// ─── ContentSource ────────────────────────────────────────────────────────────

export const comicVineContentSource: ContentSource = {
  source: "comicvine",

  async searchItems(query, { limit = 20 } = {}) {
    const issues = await searchIssues(query, limit);
    return issues.map(issueToItem);
  },

  async searchItemsByKind(kind, query, { limit = 20 } = {}) {
    if (kind === "issue") {
      return this.searchItems(query, { limit });
    }
    if (kind === "volume") {
      const volumes = await searchVolumes(query, limit);
      return volumes.map((v) => ({
        id: cvId(v.id),
        title: v.name ?? "Série",
        subtitle: v.publisher?.name,
        coverUrl: imageUrl(v.image),
        source: "comicvine",
        metadata: { itemKind: "volume", issueCount: v.count_of_issues },
      }));
    }
    if (kind === "character") {
      const characters = await searchCharacters(query, limit);
      return characters.map((c) => ({
        id: cvId(c.id),
        title: c.name ?? "Personnage",
        subtitle: c.real_name,
        coverUrl: imageUrl(c.image),
        source: "comicvine",
        metadata: { itemKind: "character" },
      }));
    }
    return this.searchItems(query, { limit });
  },

  async searchCollections(query, { limit = 20 } = {}) {
    const [volumes, arcs] = await Promise.all([
      searchVolumes(query, limit),
      searchStoryArcs(query, limit),
    ]);
    return [
      ...volumes.map(volumeToCollection),
      ...arcs.map(arcToCollection),
    ].slice(0, limit);
  },

  async searchEntities(query, { limit = 20 } = {}) {
    const characters = await searchCharacters(query, limit);
    return characters.map(characterToEntity);
  },

  async getCollectionItems(collectionId) {
    if (collectionId.startsWith("arc-")) {
      const arcId = collectionId.slice(4);
      const issues = await getStoryArcIssues(arcId);
      return issues.map(issueToItem);
    }
    const issues = await getVolumeIssues(collectionId);
    return issues.map(issueToItem);
  },

  async getEntityTopItems(entityId, { limit = 50 } = {}) {
    const issues = await getCharacterIssues(entityId, limit);
    return issues.map(issueToItem);
  },

  async getEntityById(entityId) {
    const character = await getCharacterById(entityId);
    return character ? characterToEntity(character) : null;
  },

  async getEntityCollections(entityId, { limit = 20 } = {}) {
    const issues = await getCharacterIssues(entityId, 100);
    const seen = new Map<string, ContentCollection>();
    for (const issue of issues) {
      if (issue.volume?.id) {
        const id = cvId(issue.volume.id);
        if (!seen.has(id)) {
          seen.set(id, {
            id,
            title: issue.volume.name ?? "Série",
            coverUrl: imageUrl(issue.image),
            source: "comicvine",
            metadata: { collectionKind: "volume" },
          });
        }
      }
    }
    return [...seen.values()].slice(0, limit);
  },
};
