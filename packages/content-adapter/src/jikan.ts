import type { ContentItem } from "./types";

const JIKAN_URL = "https://api.jikan.moe/v4";

// ─── Raw types ────────────────────────────────────────────────────────────────

export type JikanCharacter = {
  mal_id: number;
  url: string;
  images: {
    jpg: { image_url: string | null; small_image_url: string | null };
    webp?: { image_url: string | null };
  };
  name: string;
  name_kanji: string | null;
  nicknames: string[];
  favorites: number;
  about: string | null;
  anime: Array<{
    role: string;
    anime: { mal_id: number; title: string; images: { jpg: { image_url: string | null } } };
  }>;
  manga: Array<{
    role: string;
    manga: { mal_id: number; title: string };
  }>;
};

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function jikanGet<T>(path: string): Promise<T> {
  const res = await fetch(`${JIKAN_URL}${path}`, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(({ next: { revalidate: 3600 } } as any)),
  });
  if (!res.ok) throw new Error(`Jikan ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

// ─── Character search ─────────────────────────────────────────────────────────

export async function searchJikanCharacters(query: string, limit = 20): Promise<JikanCharacter[]> {
  if (!query.trim()) return [];
  try {
    const params = new URLSearchParams({
      q: query.trim(),
      limit: String(Math.min(limit, 25)),
      order_by: "favorites",
      sort: "desc",
    });
    const data = await jikanGet<{ data: JikanCharacter[] }>(`/characters?${params}`);
    return data.data ?? [];
  } catch {
    return [];
  }
}

// ─── Mapping ──────────────────────────────────────────────────────────────────

export function jikanCharToContentItem(
  c: JikanCharacter,
  kind: "character" | "transformation" | "power",
): ContentItem {
  const firstAnime = c.anime?.[0];
  const firstManga = c.manga?.[0];
  const subtitle = firstAnime?.anime.title ?? firstManga?.manga.title;
  return {
    id: `jchar-${c.mal_id}`,
    title: c.name,
    subtitle,
    coverUrl: c.images.webp?.image_url ?? c.images.jpg.image_url ?? undefined,
    source: "jikan",
    metadata: {
      type: kind,
      malId: c.mal_id,
      favorites: c.favorites,
      nameKanji: c.name_kanji ?? undefined,
      animeTitle: firstAnime?.anime.title,
    },
  };
}
