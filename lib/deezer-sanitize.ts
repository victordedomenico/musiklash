/**
 * Deezer API compliance helpers.
 * Only 30s preview URLs from Deezer CDN may be exposed to clients.
 */

const PREVIEW_URL_PATTERN =
  /^https:\/\/(?:e-)?cdn[st]-preview[\w-]*\.dzcdn\.net\/(?:stream|api)\//i;

export function sanitizePreviewUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const normalized = url.trim().replace(/^http:\/\//i, "https://");
  if (!PREVIEW_URL_PATTERN.test(normalized)) return null;
  return normalized;
}

export function sanitizeTrackForClient(track: {
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
}) {
  const preview = sanitizePreviewUrl(track.preview);
  if (!preview) return null;

  return {
    id: track.id,
    title: track.title,
    duration: track.duration,
    preview,
    rank: track.rank,
    contributors: track.contributors?.map((c) => ({ id: c.id, name: c.name })),
    artist: {
      id: track.artist.id,
      name: track.artist.name,
      picture_medium: track.artist.picture_medium,
    },
    album: {
      id: track.album.id,
      title: track.album.title,
      cover_small: track.album.cover_small,
      cover_medium: track.album.cover_medium,
      cover_big: track.album.cover_big,
    },
  };
}

export function sanitizeAlbumTrackForClient(track: {
  id: number;
  title: string;
  duration: number;
  preview: string;
  contributors?: Array<{ id: number; name: string }>;
  artist: { id: number; name: string };
}) {
  const preview = sanitizePreviewUrl(track.preview);
  if (!preview) return null;

  return {
    id: track.id,
    title: track.title,
    duration: track.duration,
    preview,
    contributors: track.contributors?.map((c) => ({ id: c.id, name: c.name })),
    artist: { id: track.artist.id, name: track.artist.name },
  };
}

export function sanitizeAlbumForClient(album: {
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
}) {
  return {
    id: album.id,
    title: album.title,
    cover_small: album.cover_small,
    cover_medium: album.cover_medium,
    cover_big: album.cover_big,
    nb_tracks: album.nb_tracks,
    release_date: album.release_date,
    artist: album.artist
      ? {
          id: album.artist.id,
          name: album.artist.name,
          picture_small: album.artist.picture_small,
          picture_medium: album.artist.picture_medium,
        }
      : undefined,
  };
}

export function sanitizeArtistForClient(artist: {
  id: number;
  name: string;
  picture_small?: string;
  picture_medium?: string;
  nb_album?: number;
  nb_fan?: number;
}) {
  return {
    id: artist.id,
    name: artist.name,
    picture_small: artist.picture_small,
    picture_medium: artist.picture_medium,
    nb_album: artist.nb_album,
    nb_fan: artist.nb_fan,
  };
}

export const DEEZER_PREVIEW_RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store",
} as const;
