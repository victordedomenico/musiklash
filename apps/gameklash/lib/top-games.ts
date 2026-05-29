import { getTrendingGames } from "@klash/content-adapter";
import type { ContentItem } from "@klash/content-adapter";

export type HomeGameCover = {
  id: string;
  title: string;
  coverUrl: string | null;
};

export async function getTopGames(limit = 18): Promise<HomeGameCover[]> {
  if (!process.env.RAWG_API_KEY?.trim()) {
    return [];
  }
  try {
    const games = await getTrendingGames(limit);
    return games.map((g) => ({
      id: String(g.id),
      title: g.name,
      coverUrl: g.background_image ?? null,
    }));
  } catch (err) {
    console.error("[top-games]", err);
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
