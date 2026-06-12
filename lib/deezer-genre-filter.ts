import { getDeezerGenreId, type MusicGenre } from "@/lib/genres";
import type { DeezerAlbum, DeezerArtist, DeezerTrack } from "@/lib/deezer";
import { getArtistAlbums, getAlbumGenreId } from "@/lib/deezer";

export function deezerGenreFilterId(genre: MusicGenre | null): number | null {
  if (!genre || genre === "autre") return null;
  return getDeezerGenreId(genre);
}

async function albumGenreMatches(albumId: number, deezerGenreId: number): Promise<boolean> {
  const genreId = await getAlbumGenreId(albumId);
  return genreId === deezerGenreId;
}

export async function filterTracksByDeezerGenre(
  tracks: DeezerTrack[],
  deezerGenreId: number,
): Promise<DeezerTrack[]> {
  const uniqueAlbumIds = [...new Set(tracks.map((t) => t.album.id))];
  const matches = await Promise.all(
    uniqueAlbumIds.map(
      async (albumId) => [albumId, await albumGenreMatches(albumId, deezerGenreId)] as const,
    ),
  );
  const allowed = new Set(matches.filter(([, ok]) => ok).map(([id]) => id));
  return tracks.filter((t) => allowed.has(t.album.id));
}

export function filterAlbumsByDeezerGenre(
  albums: DeezerAlbum[],
  deezerGenreId: number,
): DeezerAlbum[] {
  return albums.filter((a) => a.genre_id === deezerGenreId);
}

export async function filterArtistsByDeezerGenre(
  artists: DeezerArtist[],
  deezerGenreId: number,
): Promise<DeezerArtist[]> {
  const checks = await Promise.all(
    artists.map(async (artist) => {
      const albums = await getArtistAlbums(artist.id);
      return albums.some((album) => album.genre_id === deezerGenreId);
    }),
  );
  return artists.filter((_, i) => checks[i]);
}

export async function pickTracksForGenre(
  tracks: DeezerTrack[],
  genre: MusicGenre,
  limit: number,
): Promise<DeezerTrack[]> {
  const deezerGenreId = deezerGenreFilterId(genre);
  if (deezerGenreId === null) return tracks.slice(0, limit);
  const filtered = await filterTracksByDeezerGenre(tracks, deezerGenreId);
  return filtered.slice(0, limit);
}

export async function pickAlbumsForGenre(
  albums: DeezerAlbum[],
  genre: MusicGenre,
  limit: number,
): Promise<DeezerAlbum[]> {
  const deezerGenreId = deezerGenreFilterId(genre);
  if (deezerGenreId === null) return albums.slice(0, limit);
  return filterAlbumsByDeezerGenre(albums, deezerGenreId).slice(0, limit);
}

export async function pickArtistsForGenre(
  artists: DeezerArtist[],
  genre: MusicGenre,
  limit: number,
): Promise<DeezerArtist[]> {
  const deezerGenreId = deezerGenreFilterId(genre);
  if (deezerGenreId === null) return artists.slice(0, limit);
  const filtered = await filterArtistsByDeezerGenre(artists, deezerGenreId);
  return filtered.slice(0, limit);
}
