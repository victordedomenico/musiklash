import { getHotBoardGames } from "@klash/content-adapter";
import type { ContentItem } from "@klash/content-adapter";

export type HomeBoardGameCover = {
  id: string;
  title: string;
  coverUrl: string | null;
};

export async function getTopBoardGames(limit = 18): Promise<HomeBoardGameCover[]> {
  try {
    const games = await getHotBoardGames(limit);
    return games.map((g) => ({
      id: g.id,
      title: g.name,
      coverUrl: g.thumbnail ?? g.image ?? null,
    }));
  } catch (err) {
    console.error("[top-boardgames]", err);
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
