import { getTrendingSets } from "@klash/content-adapter";
import type { ContentItem } from "@klash/content-adapter";

export type HomeSetCover = {
  id: string;
  title: string;
  coverUrl: string | null;
};

export async function getTopSets(limit = 18): Promise<HomeSetCover[]> {
  if (!process.env.REBRICKABLE_API_KEY?.trim()) {
    return [];
  }
  try {
    const sets = await getTrendingSets(limit);
    return sets.map((s) => ({
      id: s.set_num,
      title: s.name,
      coverUrl: s.set_img_url ?? null,
    }));
  } catch (err) {
    console.error("[top-sets]", err);
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
