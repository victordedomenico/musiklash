export type DeezerTrack = {
  id: number;
  title: string;
  duration: number;
  preview: string;
  rank?: number;
  contributors?: Array<{
    id: number;
    name: string;
  }>;
  artist: {
    id: number;
    name: string;
    picture_medium?: string;
  };
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
  genre_id?: number;
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

// Tracks returned by /album/{id}/tracks — no album field, artist is partial
export type DeezerAlbumTrack = {
  id: number;
  title: string;
  duration: number;
  preview: string;
  contributors?: Array<{
    id: number;
    name: string;
  }>;
  artist: {
    id: number;
    name: string;
  };
};

export type DeezerSearchResponse = {
  data: DeezerTrack[];
  total: number;
  next?: string;
};

type TrackFetchOptions = {
  requirePreview?: boolean;
};

import { sanitizePreviewUrl } from "@/lib/deezer-sanitize";

const BASE_URL = "https://api.deezer.com";

const albumGenreCache = new Map<number, number | null>();

export async function getAlbumGenreId(albumId: number): Promise<number | null> {
  const cached = albumGenreCache.get(albumId);
  if (cached !== undefined) return cached;

  const url = `${BASE_URL}/album/${albumId}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 86400 },
  });
  if (!res.ok) {
    albumGenreCache.set(albumId, null);
    return null;
  }
  const json = (await res.json()) as { genre_id?: number; error?: unknown };
  const genreId = json.error ? null : (json.genre_id ?? null);
  albumGenreCache.set(albumId, genreId);
  return genreId;
}

export async function getTrackPreview(trackId: number | string): Promise<string | null> {
  const url = `${BASE_URL}/track/${trackId}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { preview?: string; error?: unknown };
  if (data.error) return null;
  return sanitizePreviewUrl(data.preview);
}

export async function searchTracks(
  query: string,
  limit = 25,
  options: TrackFetchOptions & { index?: number } = {},
): Promise<DeezerTrack[]> {
  const { requirePreview = true, index = 0 } = options;
  const trimmed = query.trim();
  if (!trimmed) return [];
  const url = `${BASE_URL}/search/track?q=${encodeURIComponent(trimmed)}&limit=${limit}&index=${index}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Deezer search failed: ${res.status}`);
  const json = (await res.json()) as DeezerSearchResponse;
  const tracks = json.data ?? [];
  if (!requirePreview) return tracks;
  return tracks.filter((t) => sanitizePreviewUrl(t.preview) !== null);
}

export async function searchAlbums(query: string, limit = 20, index = 0): Promise<DeezerAlbum[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const url = `${BASE_URL}/search/album?q=${encodeURIComponent(trimmed)}&limit=${limit}&index=${index}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Deezer album search failed: ${res.status}`);
  const json = (await res.json()) as { data?: DeezerAlbum[] };
  return json.data ?? [];
}

export async function searchArtists(query: string, limit = 20, index = 0): Promise<DeezerArtist[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const url = `${BASE_URL}/search/artist?q=${encodeURIComponent(trimmed)}&limit=${limit}&index=${index}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Deezer artist search failed: ${res.status}`);
  const json = (await res.json()) as { data?: DeezerArtist[] };
  return json.data ?? [];
}

export async function getAlbumTracks(
  albumId: number | string,
  options: TrackFetchOptions = {},
): Promise<DeezerAlbumTrack[]> {
  const { requirePreview = true } = options;
  const url = `${BASE_URL}/album/${albumId}/tracks?limit=100`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Deezer album tracks failed: ${res.status}`);
  const json = (await res.json()) as { data?: DeezerAlbumTrack[] };
  const tracks = json.data ?? [];
  if (!requirePreview) return tracks;
  return tracks.filter((t) => sanitizePreviewUrl(t.preview) !== null);
}

export async function getArtistAlbums(artistId: number | string): Promise<DeezerAlbum[]> {
  const url = `${BASE_URL}/artist/${artistId}/albums?limit=100`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Deezer artist albums failed: ${res.status}`);
  const json = (await res.json()) as { data?: DeezerAlbum[] };
  return json.data ?? [];
}

// Returns the top N tracks of an artist (includes the full track object)
export async function getArtistTopTracks(
  artistId: number | string,
  limit = 50,
  options: TrackFetchOptions = {},
): Promise<DeezerTrack[]> {
  const { requirePreview = true } = options;
  const url = `${BASE_URL}/artist/${artistId}/top?limit=${limit}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Deezer artist top tracks failed: ${res.status}`);
  const json = (await res.json()) as { data?: DeezerTrack[] };
  const tracks = json.data ?? [];
  if (!requirePreview) return tracks;
  return tracks.filter((t) => sanitizePreviewUrl(t.preview) !== null);
}

// Fetches a single artist by Deezer ID
export async function getArtistById(artistId: number | string): Promise<DeezerArtist | null> {
  const url = `${BASE_URL}/artist/${artistId}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as DeezerArtist & { error?: unknown };
  if (json.error) return null;
  return json;
}

async function fetchChart<T>(
  kind: "tracks" | "albums" | "artists",
  genreId: number,
  limit: number,
): Promise<T[]> {
  const url = `${BASE_URL}/chart/${genreId}/${kind}?limit=${limit}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Deezer chart ${kind} failed: ${res.status}`);
  const json = (await res.json()) as { data?: T[] };
  return json.data ?? [];
}

export function getChartTracks(genreId: number, limit = 25): Promise<DeezerTrack[]> {
  return fetchChart<DeezerTrack>("tracks", genreId, limit);
}

export function getChartAlbums(genreId: number, limit = 20): Promise<DeezerAlbum[]> {
  return fetchChart<DeezerAlbum>("albums", genreId, limit);
}

export function getChartArtists(genreId: number, limit = 20): Promise<DeezerArtist[]> {
  return fetchChart<DeezerArtist>("artists", genreId, limit);
}
