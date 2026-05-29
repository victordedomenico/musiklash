import { getTrendingBooks } from "@klash/content-adapter";
import type { ContentItem } from "@klash/content-adapter";

export type HomeBookCover = {
  id: string;
  title: string;
  coverUrl: string | null;
};

export async function getTopBooks(limit = 18): Promise<HomeBookCover[]> {
  try {
    const books = await getTrendingBooks(limit);
    return books.map((b) => ({
      id: b.work?.key?.replace(/^\/works\//, "") ?? "",
      title: b.work?.title ?? "Sans titre",
      coverUrl: b.cover_id
        ? `https://covers.openlibrary.org/b/id/${b.cover_id}-M.jpg`
        : null,
    })).filter((b) => b.id);
  } catch (err) {
    console.error("[top-books]", err);
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
