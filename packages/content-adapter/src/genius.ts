const GENIUS_API = "https://api.genius.com";

export type GeniusSongHit = {
  id: number;
  title: string;
  artist: string;
  url: string;
  thumbnailUrl?: string;
};

type GeniusSearchResponse = {
  response?: {
    hits?: Array<{
      result?: {
        id: number;
        title: string;
        url: string;
        song_art_image_thumbnail_url?: string;
        primary_artist?: { name?: string };
      };
    }>;
  };
};

function getGeniusToken(): string | undefined {
  return process.env.GENIUS_ACCESS_TOKEN?.trim() || undefined;
}

/** Search Genius for songs (lyrics metadata; full lyrics are not in the public API). */
export async function searchGeniusSongs(
  query: string,
  { limit = 10 }: { limit?: number } = {},
): Promise<GeniusSongHit[]> {
  const token = getGeniusToken();
  if (!token || !query.trim()) return [];

  const res = await fetch(
    `${GENIUS_API}/search?q=${encodeURIComponent(query.trim())}&per_page=${limit}`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      next: { revalidate: 300 },
    } as any,
  );

  if (!res.ok) {
    throw new Error(`Genius search → ${res.status}`);
  }

  const json = (await res.json()) as GeniusSearchResponse;
  const hits = json.response?.hits ?? [];

  return hits
    .map((h) => h.result)
    .filter((r): r is NonNullable<typeof r> => Boolean(r?.id && r.url))
    .map((r) => ({
      id: r.id,
      title: r.title,
      artist: r.primary_artist?.name ?? "",
      url: r.url,
      thumbnailUrl: r.song_art_image_thumbnail_url,
    }));
}

export function isGeniusConfigured(): boolean {
  return Boolean(getGeniusToken());
}
