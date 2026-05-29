import { getTrendingNbaGames, type BdlGame } from "@klash/content-adapter";
import type { ContentItem } from "@klash/content-adapter";

export type HomeGameCover = {
  id: string;
  title: string;
  subtitle: string | null;
};

function gameLabel(g: BdlGame): string {
  const home = g.home_team?.abbreviation ?? g.home_team?.name ?? "?";
  const away = g.visitor_team?.abbreviation ?? g.visitor_team?.name ?? "?";
  return `${away} @ ${home}`;
}

export async function getTopGames(limit = 18): Promise<HomeGameCover[]> {
  if (!process.env.BALLDONTLIE_API_KEY?.trim()) {
    return [];
  }
  try {
    const games = await getTrendingNbaGames(limit);
    return games.map((g) => ({
      id: String(g.id),
      title: gameLabel(g),
      subtitle:
        g.home_team_score != null && g.visitor_team_score != null
          ? `${g.visitor_team_score} – ${g.home_team_score} · ${g.status}`
          : g.status ?? null,
    }));
  } catch (err) {
    console.error("[top-games]", err);
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
