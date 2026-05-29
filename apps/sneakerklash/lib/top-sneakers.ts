import { getTrendingSneakers } from "@klash/content-adapter/sneaks";
import type { ContentItem } from "@klash/content-adapter";

export type HomeSneakerCover = {
  id: string;
  title: string;
  coverUrl: string | null;
};

export async function getTopSneakers(limit = 18): Promise<HomeSneakerCover[]> {
  try {
    const products = await getTrendingSneakers(limit);
    return products.map((p) => ({
      id: p.styleID?.trim() || p.shoeName || "unknown",
      title: p.shoeName?.trim() || p.styleID || "Sneaker",
      coverUrl: p.thumbnail ?? p.imageLinks?.[0] ?? null,
    }));
  } catch (err) {
    console.error("[top-sneakers]", err);
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
