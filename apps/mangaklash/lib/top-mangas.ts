import { getPopularMangaItems } from "@klash/content-adapter";
import type { ContentItem } from "@klash/content-adapter";

export type HomeMangaCover = {
  id: string;
  title: string;
  coverUrl: string | null;
};

export async function getTopMangas(limit = 18): Promise<HomeMangaCover[]> {
  try {
    const items = await getPopularMangaItems(limit);
    return items.map((m) => ({
      id: m.id,
      title: m.title,
      coverUrl: m.coverUrl ?? null,
    }));
  } catch (err) {
    console.error("[top-mangas]", err);
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
