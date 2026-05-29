import { getTrendingFights, type MmaFight } from "@klash/content-adapter";
import type { ContentItem } from "@klash/content-adapter";

export type HomeMatchCover = {
  id: string;
  title: string;
  subtitle: string | null;
};

function fightLabel(f: MmaFight): string {
  const a = f.fighters?.first?.name;
  const b = f.fighters?.second?.name;
  if (a && b) return `${a} vs ${b}`;
  return f.slug?.trim() || `Combat #${f.id}`;
}

export async function getTopMatches(limit = 18): Promise<HomeMatchCover[]> {
  if (!process.env.API_SPORTS_KEY?.trim()) {
    return [];
  }
  try {
    const fights = await getTrendingFights(limit);
    return fights.map((f) => ({
      id: String(f.id),
      title: fightLabel(f),
      subtitle: f.category ?? f.status?.long ?? null,
    }));
  } catch (err) {
    console.error("[top-matches]", err);
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
