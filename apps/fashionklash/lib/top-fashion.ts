import { getTrendingGarments } from "@klash/content-adapter";
import type { ContentItem } from "@klash/content-adapter";

export type HomeFashionCover = {
  id: string;
  title: string;
  coverUrl: string | null;
};

export async function getTopFashion(limit = 18): Promise<HomeFashionCover[]> {
  try {
    const items = await getTrendingGarments(limit);
    return items.map((item) => ({
      id: item.id,
      title: item.title,
      coverUrl: item.coverUrl ?? null,
    }));
  } catch (err) {
    console.error("[top-fashion]", err);
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
