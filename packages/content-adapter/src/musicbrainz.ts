import type { ContentItem, ContentCollection, ContentEntity, ContentSource } from "./types";

const MB_BASE = "https://musicbrainz.org/ws/2";
const CAA_BASE = "https://coverartarchive.org";

// ─── Raw types ────────────────────────────────────────────────────────────────

type MbRecording = {
  id: string;
  title: string;
  length?: number;
  "artist-credit"?: { name?: string; artist?: { name?: string } }[];
  releases?: { id: string; title?: string; date?: string }[];
  score?: number;
};

type MbRelease = {
  id: string;
  title: string;
  date?: string;
  "artist-credit"?: { name?: string; artist?: { name?: string } }[];
  "release-group"?: { "primary-type"?: string };
  score?: number;
};

type MbArtist = {
  id: string;
  name: string;
  "sort-name"?: string;
  disambiguation?: string;
  type?: string;
  country?: string;
  score?: number;
};

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function mbGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${MB_BASE}${path}`);
  url.searchParams.set("fmt", "json");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "Klash/1.0 (contact@klash.app)",
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    next: { revalidate: 3600 } as any,
  });
  if (!res.ok) throw new Error(`MusicBrainz ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

async function getCoverArt(releaseId: string): Promise<string | undefined> {
  try {
    // Cover Art Archive redirects to actual image; check with HEAD first
    const res = await fetch(`${CAA_BASE}/release/${releaseId}/front-500`, {
      method: "HEAD",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      next: { revalidate: 86400 } as any,
    });
    if (res.ok || res.redirected) {
      return `${CAA_BASE}/release/${releaseId}/front-500`;
    }
  } catch { /* no cover */ }
  return undefined;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function searchMbRecordings(query: string, limit = 20): Promise<MbRecording[]> {
  if (!query.trim()) return [];
  try {
    const json = await mbGet<{ recordings?: MbRecording[] }>("/recording", {
      query: query.trim(),
      limit: String(Math.min(limit, 25)),
    });
    return (json.recordings ?? [])
      .filter((r) => r.title)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, limit);
  } catch { return []; }
}

export async function searchMbReleases(query: string, limit = 20): Promise<MbRelease[]> {
  if (!query.trim()) return [];
  try {
    const json = await mbGet<{ releases?: MbRelease[] }>("/release", {
      query: query.trim(),
      limit: String(Math.min(limit, 25)),
    });
    return (json.releases ?? [])
      .filter((r) => r.title)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, limit);
  } catch { return []; }
}

export async function searchMbArtists(query: string, limit = 20): Promise<MbArtist[]> {
  if (!query.trim()) return [];
  try {
    const json = await mbGet<{ artists?: MbArtist[] }>("/artist", {
      query: query.trim(),
      limit: String(Math.min(limit, 25)),
    });
    return (json.artists ?? [])
      .filter((a) => a.name)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, limit);
  } catch { return []; }
}

export async function getMbArtistReleases(artistMbid: string, limit = 30): Promise<MbRelease[]> {
  try {
    const json = await mbGet<{ releases?: MbRelease[] }>("/release", {
      artist: artistMbid,
      limit: String(Math.min(limit, 40)),
    });
    return (json.releases ?? []).slice(0, limit);
  } catch { return []; }
}

export async function getMbReleaseRecordings(releaseMbid: string, limit = 30): Promise<MbRecording[]> {
  try {
    const json = await mbGet<{ media?: { tracks?: { id: string; title: string; length?: number; "artist-credit"?: MbRecording["artist-credit"] }[] }[] }>(
      `/release/${releaseMbid}`,
      { inc: "recordings+artist-credits" },
    );
    return (json.media ?? [])
      .flatMap((m) => m.tracks ?? [])
      .slice(0, limit)
      .map((t) => ({ id: t.id, title: t.title, length: t.length, "artist-credit": t["artist-credit"] }));
  } catch { return []; }
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function artistCredit(r: { "artist-credit"?: MbRecording["artist-credit"] }): string | undefined {
  return r["artist-credit"]?.map((c) => c.name ?? c.artist?.name ?? "").filter(Boolean).join(", ") || undefined;
}

export function mbRecordingToItem(r: MbRecording): ContentItem {
  const artist = artistCredit(r);
  const release = r.releases?.[0];
  return {
    id: `mb-rec-${r.id}`,
    title: r.title,
    subtitle: [artist, release?.title].filter(Boolean).join(" · "),
    source: "musicbrainz",
    metadata: {
      itemKind: "track",
      mbid: r.id,
      artist,
      releaseId: release?.id,
      durationMs: r.length,
    },
  };
}

export function mbReleaseToItem(r: MbRelease): ContentItem {
  const artist = artistCredit(r);
  return {
    id: `mb-rel-${r.id}`,
    title: r.title,
    subtitle: [artist, r.date?.slice(0, 4)].filter(Boolean).join(" · "),
    source: "musicbrainz",
    metadata: {
      itemKind: "album",
      mbid: r.id,
      artist,
      year: r.date?.slice(0, 4),
      releaseType: r["release-group"]?.["primary-type"],
    },
  };
}

export function mbReleaseToCollection(r: MbRelease): ContentCollection {
  const artist = artistCredit(r);
  return {
    id: `mb-rel-${r.id}`,
    title: r.title,
    source: "musicbrainz",
    metadata: { collectionKind: "album", mbid: r.id, artist, year: r.date?.slice(0, 4) },
  };
}

export function mbArtistToEntity(a: MbArtist): ContentEntity {
  return {
    id: `mb-art-${a.id}`,
    name: a.name,
    source: "musicbrainz",
    metadata: { entityKind: "artist", mbid: a.id, type: a.type, country: a.country },
  };
}

// ─── ContentSource ────────────────────────────────────────────────────────────

export const musicbrainzContentSource: ContentSource = {
  source: "musicbrainz",

  async searchItems(query, { limit = 20 } = {}) {
    const recs = await searchMbRecordings(query, limit);
    return recs.map(mbRecordingToItem);
  },

  async searchItemsByKind(kind, query, { limit = 20 } = {}) {
    if (kind === "track" || kind === "recording") return this.searchItems(query, { limit });
    if (kind === "album" || kind === "release") {
      const releases = await searchMbReleases(query, limit);
      return releases.map(mbReleaseToItem);
    }
    return this.searchItems(query, { limit });
  },

  async searchCollections(query, { limit = 20 } = {}) {
    const releases = await searchMbReleases(query, limit);
    return releases.map(mbReleaseToCollection);
  },

  async searchEntities(query, { limit = 20 } = {}) {
    const artists = await searchMbArtists(query, limit);
    return artists.map(mbArtistToEntity);
  },

  async getCollectionItems(collectionId) {
    const mbid = collectionId.replace(/^mb-rel-/, "");
    const recs = await getMbReleaseRecordings(mbid, 30);
    return recs.map(mbRecordingToItem);
  },

  async getEntityTopItems(entityId, { limit = 20 } = {}) {
    const mbid = entityId.replace(/^mb-art-/, "");
    const releases = await getMbArtistReleases(mbid, limit);
    return releases.map(mbReleaseToItem);
  },

  async getEntityById(entityId) {
    const mbid = entityId.replace(/^mb-art-/, "");
    try {
      const json = await mbGet<MbArtist>(`/artist/${mbid}`);
      return mbArtistToEntity(json);
    } catch { return null; }
  },

  async getEntityCollections(entityId, { limit = 20 } = {}) {
    const mbid = entityId.replace(/^mb-art-/, "");
    const releases = await getMbArtistReleases(mbid, limit);
    return releases.map(mbReleaseToCollection);
  },
};

export { getCoverArt as getMbCoverArt };
