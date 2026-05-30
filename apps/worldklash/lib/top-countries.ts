import { getTrendingCountries } from "@klash/content-adapter";
import type { ContentItem } from "@klash/content-adapter";

export type HomeCountryCover = {
  id: string;
  title: string;
  coverUrl: string | null;
};

export async function getTopCountries(limit = 18): Promise<HomeCountryCover[]> {
  try {
    const countries = await getTrendingCountries(limit);
    return countries.map((c) => ({
      id: c.cca2 ?? c.cca3 ?? "",
      title: c.name?.common ?? "Pays",
      coverUrl: c.cca2
        ? `https://flagcdn.com/w320/${c.cca2.toLowerCase()}.png`
        : (c.flags?.png ?? null),
    }));
  } catch (err) {
    console.error("[top-countries]", err);
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
