import type { ContentItem, ContentCollection, ContentEntity, ContentSource } from "./types";

const BASE_URL = "https://api.deezer.com";

// ─── Raw Deezer types ─────────────────────────────────────────────────────────

export type DeezerTrack = {
  id: number;
  title: string;
  duration: number;
  preview: string;
  rank?: number;
  contributors?: Array<{ id: number; name: string }>;
  artist: { id: number; name: string; picture_medium?: string };
  album: {
    id: number;
    title: string;
    cover_small?: string;
    cover_medium?: string;
    cover_big?: string;
  };
};

export type DeezerAlbum = {
  id: number;
  title: string;
  cover_small?: string;
  cover_medium?: string;
  cover_big?: string;
  nb_tracks?: number;
  release_date?: string;
  artist?: {
    id: number;
    name: string;
    picture_small?: string;
    picture_medium?: string;
  };
};

export type DeezerArtist = {
  id: number;
  name: string;
  picture_small?: string;
  picture_medium?: string;
  nb_album?: number;
  nb_fan?: number;
};

export type DeezerAlbumTrack = {
  id: number;
  title: string;
  duration: number;
  preview: string;
  contributors?: Array<{ id: number; name: string }>;
  artist: { id: number; name: string };
};

type DeezerSearchResponse = { data: DeezerTrack[]; total: number; next?: string };

// ─── Low-level fetch helpers ──────────────────────────────────────────────────

async function deezerGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    next: { revalidate: 3600 },
  } as any);
  if (!res.ok) throw new Error(`Deezer ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

// ─── Raw API functions (kept for direct use in musiklash API routes) ──────────

export async function searchTracks(
  query: string,
  limit = 25,
  { requirePreview = true } = {},
): Promise<DeezerTrack[]> {
  if (!query.trim()) return [];
  const json = await deezerGet<DeezerSearchResponse>(
    `/search/track?q=${encodeURIComponent(query.trim())}&limit=${limit}`,
  );
  const tracks = json.data ?? [];
  return requirePreview ? tracks.filter((t) => t.preview?.length > 0) : tracks;
}

export async function searchAlbums(query: string, limit = 20): Promise<DeezerAlbum[]> {
  if (!query.trim()) return [];
  const json = await deezerGet<{ data?: DeezerAlbum[] }>(
    `/search/album?q=${encodeURIComponent(query.trim())}&limit=${limit}`,
  );
  return json.data ?? [];
}

export async function searchArtists(query: string, limit = 20): Promise<DeezerArtist[]> {
  if (!query.trim()) return [];
  const json = await deezerGet<{ data?: DeezerArtist[] }>(
    `/search/artist?q=${encodeURIComponent(query.trim())}&limit=${limit}`,
  );
  return json.data ?? [];
}

export async function getAlbumTracks(
  albumId: number | string,
  { requirePreview = true } = {},
): Promise<DeezerAlbumTrack[]> {
  const json = await deezerGet<{ data?: DeezerAlbumTrack[] }>(
    `/album/${albumId}/tracks?limit=100`,
  );
  const tracks = json.data ?? [];
  return requirePreview ? tracks.filter((t) => t.preview?.length > 0) : tracks;
}

export async function getArtistAlbums(artistId: number | string): Promise<DeezerAlbum[]> {
  const json = await deezerGet<{ data?: DeezerAlbum[] }>(
    `/artist/${artistId}/albums?limit=100`,
  );
  return json.data ?? [];
}

export async function getArtistTopTracks(
  artistId: number | string,
  limit = 50,
  { requirePreview = true } = {},
): Promise<DeezerTrack[]> {
  const json = await deezerGet<{ data?: DeezerTrack[] }>(
    `/artist/${artistId}/top?limit=${limit}`,
  );
  const tracks = json.data ?? [];
  return requirePreview ? tracks.filter((t) => t.preview?.length > 0) : tracks;
}

export async function getArtistById(artistId: number | string): Promise<DeezerArtist | null> {
  const json = await deezerGet<DeezerArtist & { error?: unknown }>(`/artist/${artistId}`);
  return json.error ? null : json;
}

// ─── ContentSource implementation ────────────────────────────────────────────

function trackToItem(t: DeezerTrack | DeezerAlbumTrack): ContentItem {
  const album = "album" in t ? t.album : undefined;
  return {
    id: String(t.id),
    title: t.title,
    subtitle: t.artist.name,
    coverUrl: album?.cover_medium ?? album?.cover_big ?? album?.cover_small,
    previewUrl: t.preview || undefined,
    source: "deezer",
    metadata: {
      rank: ("rank" in t ? t.rank : undefined) ?? 0,
      duration: t.duration,
      artistName: t.artist.name,
    },
  };
}

function albumToCollection(a: DeezerAlbum): ContentCollection {
  return {
    id: String(a.id),
    title: a.title,
    coverUrl: a.cover_medium ?? a.cover_big ?? a.cover_small,
    source: "deezer",
    metadata: {
      nbTracks: a.nb_tracks,
      releaseDate: a.release_date,
      artistName: a.artist?.name,
    },
  };
}

function artistToEntity(a: DeezerArtist): ContentEntity {
  return {
    id: String(a.id),
    name: a.name,
    pictureUrl: a.picture_medium ?? a.picture_small,
    fanCount: a.nb_fan,
    source: "deezer",
    metadata: { albumCount: a.nb_album },
  };
}

export const deezerContentSource: ContentSource = {
  source: "deezer",

  async searchItems(query, { limit = 25, requirePreview = true } = {}) {
    const tracks = await searchTracks(query, limit, { requirePreview });
    return tracks.map(trackToItem);
  },

  async searchCollections(query, { limit = 20 } = {}) {
    const albums = await searchAlbums(query, limit);
    return albums.map(albumToCollection);
  },

  async searchEntities(query, { limit = 20 } = {}) {
    const artists = await searchArtists(query, limit);
    return artists.map(artistToEntity);
  },

  async getCollectionItems(collectionId, { requirePreview = true } = {}) {
    const tracks = await getAlbumTracks(collectionId, { requirePreview });
    return tracks.map(trackToItem);
  },

  async getEntityTopItems(entityId, { limit = 50, requirePreview = true } = {}) {
    const tracks = await getArtistTopTracks(entityId, limit, { requirePreview });
    return tracks.map(trackToItem);
  },

  async getEntityById(entityId) {
    const artist = await getArtistById(entityId);
    return artist ? artistToEntity(artist) : null;
  },

  async getEntityCollections(entityId, { limit = 100 } = {}) {
    const albums = await getArtistAlbums(entityId);
    return albums.slice(0, limit).map(albumToCollection);
  },

  async refreshItemPreview(itemId) {
    // Deezer preview URLs are signed and expire — never cache the refresh.
    const res = await fetch(`${BASE_URL}/track/${itemId}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { preview?: string };
    return json.preview || null;
  },
};
