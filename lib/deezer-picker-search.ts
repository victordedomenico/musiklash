import {
  GENRE_BROWSE_QUERY,
  getDeezerGenreId,
  isMusicGenre,
  type MusicGenre,
} from "@/lib/genres";
import {
  pickAlbumsForGenre,
  pickArtistsForGenre,
  pickTracksForGenre,
} from "@/lib/deezer-genre-filter";
import type { DeezerAlbum, DeezerArtist, DeezerTrack } from "@/lib/deezer";
import {
  getChartAlbums,
  getChartArtists,
  getChartTracks,
  searchAlbums,
  searchArtists,
  searchTracks,
} from "@/lib/deezer";

export function parsePickerGenre(raw: string | null): MusicGenre | null {
  return raw && isMusicGenre(raw) ? raw : null;
}

const GENRE_SEARCH_POOL = 50;

async function searchTracksWithGenreFilter(
  query: string,
  genre: MusicGenre,
  limit: number,
): Promise<DeezerTrack[]> {
  const batch = await searchTracks(query, GENRE_SEARCH_POOL);
  return pickTracksForGenre(batch, genre, limit);
}

async function searchAlbumsWithGenreFilter(
  query: string,
  genre: MusicGenre,
  limit: number,
): Promise<DeezerAlbum[]> {
  const batch = await searchAlbums(query, GENRE_SEARCH_POOL);
  return pickAlbumsForGenre(batch, genre, limit);
}

async function searchArtistsWithGenreFilter(
  query: string,
  genre: MusicGenre,
  limit: number,
): Promise<DeezerArtist[]> {
  const batch = await searchArtists(query, GENRE_SEARCH_POOL);
  return pickArtistsForGenre(batch, genre, limit);
}

export async function searchTracksForPicker(
  query: string,
  genre: MusicGenre | null,
  limit = 25,
) {
  const trimmed = query.trim();
  const deezerId = getDeezerGenreId(genre);

  if (!trimmed) {
    if (deezerId !== null) return getChartTracks(deezerId, limit);
    const browse = genre ? GENRE_BROWSE_QUERY[genre] : null;
    if (browse) return searchTracks(browse, limit);
    return [];
  }

  if (genre && deezerId !== null) {
    return searchTracksWithGenreFilter(trimmed, genre, limit);
  }

  return searchTracks(trimmed, limit);
}

export async function searchAlbumsForPicker(
  query: string,
  genre: MusicGenre | null,
  limit = 20,
) {
  const trimmed = query.trim();
  const deezerId = getDeezerGenreId(genre);

  if (!trimmed) {
    if (deezerId !== null) return getChartAlbums(deezerId, limit);
    const browse = genre ? GENRE_BROWSE_QUERY[genre] : null;
    if (browse) return searchAlbums(browse, limit);
    return [];
  }

  if (genre && deezerId !== null) {
    return searchAlbumsWithGenreFilter(trimmed, genre, limit);
  }

  return searchAlbums(trimmed, limit);
}

export async function searchArtistsForPicker(
  query: string,
  genre: MusicGenre | null,
  limit = 20,
) {
  const trimmed = query.trim();
  const deezerId = getDeezerGenreId(genre);

  if (!trimmed) {
    if (deezerId !== null) return getChartArtists(deezerId, limit);
    const browse = genre ? GENRE_BROWSE_QUERY[genre] : null;
    if (browse) return searchArtists(browse, limit);
    return [];
  }

  if (genre && deezerId !== null) {
    return searchArtistsWithGenreFilter(trimmed, genre, limit);
  }

  return searchArtists(trimmed, limit);
}
