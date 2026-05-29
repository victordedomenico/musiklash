import { getRecentIssues } from "@klash/content-adapter";
import type { ContentItem } from "@klash/content-adapter";

export type HomeComicCover = {
  id: string;
  title: string;
  coverUrl: string | null;
};

export async function getTopComics(limit = 18): Promise<HomeComicCover[]> {
  if (!process.env.COMIC_VINE_API_KEY?.trim()) {
    return [];
  }
  try {
    const issues = await getRecentIssues(limit);
    return issues.map((issue) => ({
      id: String(issue.id),
      title: issue.name ?? `Numéro ${issue.issue_number ?? issue.id}`,
      coverUrl: issue.image?.medium_url ?? issue.image?.screen_url ?? null,
    }));
  } catch (err) {
    console.error("[top-comics]", err);
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
