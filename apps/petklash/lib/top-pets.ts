import { getTrendingBreeds } from "@klash/content-adapter";
import type { ContentItem } from "@klash/content-adapter";

export type HomePetCover = {
  id: string;
  title: string;
  coverUrl: string | null;
};

export async function getTopPets(limit = 18): Promise<HomePetCover[]> {
  try {
    const breeds = await getTrendingBreeds(limit);
    return breeds.map((b) => ({
      id: b.id,
      title: b.title,
      coverUrl: b.coverUrl ?? null,
    }));
  } catch (err) {
    console.error("[top-pets]", err);
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
