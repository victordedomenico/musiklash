import { getTrendingTennisPlayers } from "@klash/content-adapter";
import type { ContentItem } from "@klash/content-adapter";

export type HomePlayerCover = {
  id: string;
  title: string;
  coverUrl: string | null;
};

export async function getTopPlayers(limit = 18): Promise<HomePlayerCover[]> {
  try {
    const players = await getTrendingTennisPlayers(limit);
    return players.map((p) => ({
      id: p.idPlayer,
      title: p.strPlayer,
      coverUrl: p.strCutout ?? p.strThumb ?? null,
    }));
  } catch (err) {
    console.error("[top-players]", err);
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
