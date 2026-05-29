import { getTrendingIndieGames } from "@klash/content-adapter";
import type { ContentItem } from "@klash/content-adapter";

export type HomeIndieCover = {
  id: string;
  title: string;
  coverUrl: string | null;
};

export async function getTopIndieGames(limit = 18): Promise<HomeIndieCover[]> {
  if (!process.env.RAWG_API_KEY?.trim()) {
    return [];
  }
  try {
    const games = await getTrendingIndieGames(limit);
    return games.map((g) => ({
      id: String(g.id),
      title: g.name,
      coverUrl: g.background_image ?? null,
    }));
  } catch (err) {
    console.error("[top-indie-games]", err);
    return [];
  }
}

export function toSelectedFromContentItem(item: ContentItem): {
  external_id: string;
  title: string;
  subtitle?: string;
  cover_url: string | null;
  source: string;
} {
  return {
    external_id: item.id,
    title: item.title,
    subtitle: item.subtitle,
    cover_url: item.coverUrl ?? null,
    source: item.source,
  };
}
