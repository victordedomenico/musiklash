import { sanitizePreviewUrl } from "@/lib/deezer-sanitize";

export type DeezerClientTrackDetails = {
  preview: string | null;
  album: string | null;
  artist: string | null;
};

/** Fetch validated 30s Deezer preview URL and metadata via the server proxy. */
export async function fetchTrackDetails(
  deezerTrackId: number,
): Promise<DeezerClientTrackDetails | null> {
  const res = await fetch(`/api/deezer/track/${deezerTrackId}`, { cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    preview?: string;
    album?: string | null;
    artist?: string | null;
  };
  return {
    preview: sanitizePreviewUrl(data.preview),
    album: typeof data.album === "string" ? data.album : null,
    artist: typeof data.artist === "string" ? data.artist : null,
  };
}

/** Fetch a validated 30s Deezer preview URL via the server proxy. */
export async function fetchTrackPreview(deezerTrackId: number): Promise<string | null> {
  const details = await fetchTrackDetails(deezerTrackId);
  return details?.preview ?? null;
}
