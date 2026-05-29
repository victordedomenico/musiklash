import { getTrendingShows } from "@klash/content-adapter";
import type { ContentItem } from "@klash/content-adapter";

export type HomeSeriesCover = {
  id: string;
  title: string;
  coverUrl: string | null;
};

export async function getTopSeries(limit = 18): Promise<HomeSeriesCover[]> {
  try {
    const shows = await getTrendingShows(limit);
    return shows.map((s) => ({
      id: String(s.id),
      title: s.name,
      coverUrl: s.image?.medium ?? s.image?.original ?? null,
    }));
  } catch (err) {
    console.error("[top-series]", err);
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
