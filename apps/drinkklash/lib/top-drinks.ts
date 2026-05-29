import { getTrendingCocktails } from "@klash/content-adapter";
import type { ContentItem } from "@klash/content-adapter";

export type HomeDrinkCover = {
  id: string;
  title: string;
  coverUrl: string | null;
};

export async function getTopDrinks(limit = 18): Promise<HomeDrinkCover[]> {
  try {
    const drinks = await getTrendingCocktails(limit);
    return drinks
      .map((d) => ({
        id: d.idDrink ?? "",
        title: d.strDrink ?? "Sans titre",
        coverUrl: d.strDrinkThumb ?? null,
      }))
      .filter((d) => d.id);
  } catch (err) {
    console.error("[top-drinks]", err);
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
