import { getTrendingMatches, type PandaMatch } from "@klash/content-adapter";
import type { ContentItem } from "@klash/content-adapter";

export type HomeMatchCover = {
  id: string;
  title: string;
  subtitle: string | null;
};

function matchLabel(m: PandaMatch): string {
  const teams = (m.opponents ?? [])
    .filter((o) => o.type === "Team" && o.opponent && "name" in o.opponent)
    .map((o) => {
      const t = o.opponent as { name?: string; acronym?: string | null };
      return t.acronym || t.name;
    })
    .filter(Boolean);
  if (teams.length >= 2) return teams.join(" vs ");
  return m.name;
}

export async function getTopMatches(limit = 18): Promise<HomeMatchCover[]> {
  if (!process.env.PANDASCORE_API_KEY?.trim()) {
    return [];
  }
  try {
    const matches = await getTrendingMatches(limit);
    return matches.map((m) => ({
      id: String(m.id),
      title: matchLabel(m),
      subtitle: m.videogame?.name ?? m.league?.name ?? m.status ?? null,
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
