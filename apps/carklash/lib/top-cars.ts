import { getTrendingCars } from "@klash/content-adapter";
import type { ContentItem } from "@klash/content-adapter";

export type HomeCarCover = {
  id: string;
  title: string;
  subtitle?: string;
  coverUrl: string | null;
};

export async function getTopCars(limit = 18): Promise<HomeCarCover[]> {
  try {
    const models = await getTrendingCars(limit);
    return models.map((m) => ({
      id: m.id,
      title: m.title,
      subtitle: m.subtitle,
      coverUrl: m.coverUrl ?? null,
    }));
  } catch (err) {
    console.error("[top-cars]", err);
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
