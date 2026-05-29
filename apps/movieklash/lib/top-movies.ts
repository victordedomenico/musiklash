import { getTrendingMovies } from "@klash/content-adapter";
import type { ContentItem } from "@klash/content-adapter";

const IMAGE_CDN = "https://image.tmdb.org/t/p/w500";

export type HomeMovieCover = {
  id: string;
  title: string;
  coverUrl: string | null;
};

export async function getTopMovies(limit = 18): Promise<HomeMovieCover[]> {
  if (!process.env.TMDB_API_KEY?.trim()) {
    return [];
  }
  try {
    const movies = await getTrendingMovies(limit);
    return movies.map((m) => ({
      id: String(m.id),
      title: m.title,
      coverUrl: m.poster_path ? `${IMAGE_CDN}${m.poster_path}` : null,
    }));
  } catch (err) {
    console.error("[top-movies]", err);
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
