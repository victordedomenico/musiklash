import { getTrendingEvents, type SportsDbEvent } from "@klash/content-adapter";
import type { ContentItem } from "@klash/content-adapter";

export type HomeMatchCover = {
  id: string;
  title: string;
  subtitle: string | null;
};

function matchLabel(event: SportsDbEvent): string {
  if (event.strEvent?.trim()) return event.strEvent.trim();
  const home = event.strHomeTeam?.trim();
  const away = event.strAwayTeam?.trim();
  if (home && away) return `${home} vs ${away}`;
  return `Match #${event.idEvent}`;
}

export async function getTopEvents(limit = 18): Promise<HomeMatchCover[]> {
  try {
    const events = await getTrendingEvents(limit);
    return events.map((event) => ({
      id: event.idEvent,
      title: matchLabel(event),
      subtitle: event.strLeague ?? event.strSport ?? event.strStatus ?? null,
    }));
  } catch (err) {
    console.error("[top-events]", err);
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
