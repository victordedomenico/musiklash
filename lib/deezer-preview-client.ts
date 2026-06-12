import { sanitizePreviewUrl } from "@/lib/deezer-sanitize";

/** Fetch a validated 30s Deezer preview URL via the server proxy. */
export async function fetchTrackPreview(deezerTrackId: number): Promise<string | null> {
  const res = await fetch(`/api/deezer/track/${deezerTrackId}`, { cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as { preview?: string };
  return sanitizePreviewUrl(data.preview);
}
