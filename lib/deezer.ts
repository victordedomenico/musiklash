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

const BASE_URL = "https://api.deezer.com";

export async function searchTracks(
  query: string,
  limit = 25,
  options: TrackFetchOptions = {},
): Promise<DeezerTrack[]> {
  const { requirePreview = true } = options;
  const trimmed = query.trim();
  if (!trimmed) return [];
  const url = `${BASE_URL}/search/track?q=${encodeURIComponent(trimmed)}&limit=${limit}`;
  const res = await fetch(url, { headers: { Accept: "application/json" }, next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Deezer search failed: ${res.status}`);
  const json = (await res.json()) as DeezerSearchResponse;
  const tracks = json.data ?? [];
  return requirePreview ? tracks.filter((t) => t.preview && t.preview.length > 0) : tracks;
}

export async function searchAlbums(query: string, limit = 20): Promise<DeezerAlbum[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const url = `${BASE_URL}/search/album?q=${encodeURIComponent(trimmed)}&limit=${limit}`;
  const res = await fetch(url, { headers: { Accept: "application/json" }, next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Deezer album search failed: ${res.status}`);
  const json = await res.json() as { data?: DeezerAlbum[] };
  return json.data ?? [];
}

export async function searchArtists(query: string, limit = 20): Promise<DeezerArtist[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const url = `${BASE_URL}/search/artist?q=${encodeURIComponent(trimmed)}&limit=${limit}`;
  const res = await fetch(url, { headers: { Accept: "application/json" }, next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Deezer artist search failed: ${res.status}`);
  const json = await res.json() as { data?: DeezerArtist[] };
  return json.data ?? [];
}

export async function getAlbumTracks(
  albumId: number | string,
  options: TrackFetchOptions = {},
): Promise<DeezerAlbumTrack[]> {
  const { requirePreview = true } = options;
  const url = `${BASE_URL}/album/${albumId}/tracks?limit=100`;
  const res = await fetch(url, { headers: { Accept: "application/json" }, next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Deezer album tracks failed: ${res.status}`);
  const json = await res.json() as { data?: DeezerAlbumTrack[] };
  const tracks = json.data ?? [];
  return requirePreview ? tracks.filter((t) => t.preview && t.preview.length > 0) : tracks;
}

export async function getArtistAlbums(artistId: number | string): Promise<DeezerAlbum[]> {
  const url = `${BASE_URL}/artist/${artistId}/albums?limit=100`;
  const res = await fetch(url, { headers: { Accept: "application/json" }, next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Deezer artist albums failed: ${res.status}`);
  const json = await res.json() as { data?: DeezerAlbum[] };
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
  const res = await fetch(url, { headers: { Accept: "application/json" }, next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Deezer artist top tracks failed: ${res.status}`);
  const json = await res.json() as { data?: DeezerTrack[] };
  const tracks = json.data ?? [];
  return requirePreview ? tracks.filter((t) => t.preview && t.preview.length > 0) : tracks;
}

// Fetches a single artist by Deezer ID
export async function getArtistById(artistId: number | string): Promise<DeezerArtist | null> {
  const url = `${BASE_URL}/artist/${artistId}`;
  const res = await fetch(url, { headers: { Accept: "application/json" }, next: { revalidate: 3600 } });
  if (!res.ok) return null;
  const json = await res.json() as DeezerArtist & { error?: unknown };
  if (json.error) return null;
  return json;
}
