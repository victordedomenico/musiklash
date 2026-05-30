import { getTrendingMeals } from "@klash/content-adapter";
import type { ContentItem } from "@klash/content-adapter";

export type HomeMealCover = {
  id: string;
  title: string;
  coverUrl: string | null;
};

export async function getTopMeals(limit = 18): Promise<HomeMealCover[]> {
  try {
    const meals = await getTrendingMeals(limit);
    return meals
      .map((m) => ({
        id: m.idMeal,
        title: m.strMeal ?? "Sans titre",
        coverUrl: m.strMealThumb ?? null,
      }))
      .filter((m) => m.id);
  } catch (err) {
    console.error("[top-meals]", err);
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
