import {
  getAlbumTracks,
  getArtistAlbums,
  getArtistById,
  getArtistTopTracks,
  searchAlbums,
  searchArtists,
  searchTracks,
  type DeezerAlbum,
  type DeezerAlbumTrack,
  type DeezerArtist,
  type DeezerTrack,
} from "./deezer";
import type { ContentCollection, ContentEntity, ContentItem, ContentSource } from "./types";

const BASE_URL = "https://api.deezer.com";

/** Deezer genre id for Rap / Hip-Hop (global catalogue). */
export const DEEZER_RAP_GENRE_ID = 116;

type AlbumGenreCache = Map<number, number | null>;

async function deezerGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    next: { revalidate: 3600 },
  } as any);
  if (!res.ok) throw new Error(`Deezer ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

async function loadAlbumGenreIds(
  albumIds: number[],
  cache: AlbumGenreCache,
): Promise<void> {
  const missing = albumIds.filter((id) => !cache.has(id));
  if (missing.length === 0) return;
  await Promise.all(
    missing.map(async (id) => {
      try {
        const album = await deezerGet<{ genre_id?: number }>(`/album/${id}`);
        cache.set(id, album.genre_id ?? null);
      } catch {
        cache.set(id, null);
      }
    }),
  );
}

function isRapGenre(genreId: number | null | undefined): boolean {
  return genreId === DEEZER_RAP_GENRE_ID;
}

function albumIdFromTrack(track: { album?: { id: number } }): number | null {
  return track.album?.id ?? null;
}

async function isRapAlbum(albumId: number, cache: AlbumGenreCache): Promise<boolean> {
  await loadAlbumGenreIds([albumId], cache);
  return isRapGenre(cache.get(albumId));
}

async function filterRapTracks<T extends { album?: { id: number } }>(
  tracks: T[],
  cache: AlbumGenreCache,
  fallbackAlbumId?: number,
): Promise<T[]> {
  if (tracks.length === 0) return [];
  const albumIds = [
    ...new Set(
      tracks
        .map((t) => albumIdFromTrack(t) ?? fallbackAlbumId)
        .filter((id): id is number => id != null),
    ),
  ];
  if (albumIds.length === 0) return tracks;
  await loadAlbumGenreIds(albumIds, cache);
  return tracks.filter((t) => {
    const albumId = albumIdFromTrack(t) ?? fallbackAlbumId;
    return albumId != null && isRapGenre(cache.get(albumId));
  });
}

async function filterRapAlbums(
  albums: DeezerAlbum[],
  cache: AlbumGenreCache,
): Promise<DeezerAlbum[]> {
  if (albums.length === 0) return [];
  const ids = albums.map((a) => a.id);
  await loadAlbumGenreIds(ids, cache);
  return albums.filter((a) => isRapGenre(cache.get(a.id)));
}

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
      rapGenre: true,
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
      rapGenre: true,
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

const albumGenreCache: AlbumGenreCache = new Map();

export const rapDeezerContentSource: ContentSource = {
  source: "deezer",

  async searchItems(query, { limit = 25, requirePreview = true } = {}) {
    const tracks = await searchTracks(query, limit, { requirePreview });
    const rapTracks = await filterRapTracks(tracks, albumGenreCache);
    return rapTracks.map(trackToItem);
  },

  async searchCollections(query, { limit = 20 } = {}) {
    const albums = await searchAlbums(query, limit);
    const rapAlbums = await filterRapAlbums(albums, albumGenreCache);
    return rapAlbums.map(albumToCollection);
  },

  async searchEntities(query, { limit = 20 } = {}) {
    const artists = await searchArtists(query, limit);
    return artists.map(artistToEntity);
  },

  async getCollectionItems(collectionId, { requirePreview = true } = {}) {
    const albumId = Number(collectionId);
    if (!Number.isFinite(albumId)) return [];
    if (!(await isRapAlbum(albumId, albumGenreCache))) return [];
    const tracks = await getAlbumTracks(collectionId, { requirePreview });
    return tracks.map(trackToItem);
  },

  async getEntityTopItems(entityId, { limit = 50, requirePreview = true } = {}) {
    const tracks = await getArtistTopTracks(entityId, limit, { requirePreview });
    const rapTracks = await filterRapTracks(tracks, albumGenreCache);
    return rapTracks.map(trackToItem);
  },

  async getEntityById(entityId) {
    const artist = await getArtistById(entityId);
    return artist ? artistToEntity(artist) : null;
  },

  async getEntityCollections(entityId, { limit = 100 } = {}) {
    const albums = await getArtistAlbums(entityId);
    const rapAlbums = await filterRapAlbums(albums, albumGenreCache);
    return rapAlbums.slice(0, limit).map(albumToCollection);
  },

  async refreshItemPreview(itemId) {
    const res = await fetch(`${BASE_URL}/track/${itemId}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { preview?: string };
    return json.preview || null;
  },
};
