import { getTrendingExercises } from "@klash/content-adapter";
import type { ContentItem } from "@klash/content-adapter";

export type HomeExerciseCover = {
  id: string;
  title: string;
  coverUrl: string | null;
};

export async function getTopExercises(limit = 18): Promise<HomeExerciseCover[]> {
  try {
    const exercises = await getTrendingExercises(limit);
    return exercises.map((e) => ({
      id: e.id,
      title: e.title,
      coverUrl: e.coverUrl ?? null,
    }));
  } catch (err) {
    console.error("[top-exercises]", err);
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
