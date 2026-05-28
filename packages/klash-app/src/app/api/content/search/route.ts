import { NextResponse } from "next/server";
import type { ContentItem } from "@klash/content-adapter";
import { getCurrentVertical } from "@klash/klash-config";

export const dynamic = "force-dynamic";

function legacyAnimeData(items: ContentItem[]) {
  return items.map((i) => ({
    id: Number(i.id) || 0,
    title: i.title,
    coverUrl: i.coverUrl ?? null,
    format: String(i.metadata?.status ?? i.subtitle ?? ""),
    popularity: Number(i.metadata?.popularity ?? 0),
  }));
}

function legacyCharacterData(items: ContentItem[]) {
  return items.map((i) => {
    const rawId = i.metadata?.anilistCharacterId ?? i.id.replace(/^char-/, "");
    return {
      id: Number(rawId) || 0,
      name: i.title,
      imageUrl: i.coverUrl ?? null,
      animes: i.subtitle ? [i.subtitle] : [],
    };
  });
}

function legacyArcData(items: ContentItem[]) {
  return items.map((i) => ({
    id: Number(i.id) || 0,
    title: i.title,
    coverUrl: i.coverUrl ?? null,
    parentTitle: (i.metadata?.parentTitle as string | undefined) ?? i.subtitle ?? null,
    format: (i.metadata?.format as string | undefined) ?? null,
    episodes: (i.metadata?.episodes as number | undefined) ?? null,
  }));
}

/**
 * Generic content search delegating to the active vertical's ContentSource.
 *   ?q=<query>&kind=items|collections|entities&limit=<n>
 *   ?kind=items&subtype=anime|character|arc&legacy=anime|character|arc  (AniList picker compat)
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const kind = searchParams.get("kind") ?? "items";
  const subtype = searchParams.get("subtype");
  const legacy = searchParams.get("legacy");
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;

  if (!q) return NextResponse.json({ results: [], data: [] });

  const { contentSource } = getCurrentVertical();

  try {
    if (subtype && contentSource.searchItemsByKind) {
      const results = await contentSource.searchItemsByKind(
        subtype,
        q,
        limit ? { limit } : undefined,
      );
      const payload: { results: ContentItem[]; data?: unknown[] } = { results };
      if (legacy === "anime") payload.data = legacyAnimeData(results);
      if (legacy === "character") payload.data = legacyCharacterData(results);
      if (legacy === "arc") payload.data = legacyArcData(results);
      return NextResponse.json(payload);
    }

    switch (kind) {
      case "collections": {
        const results = await contentSource.searchCollections(q, limit ? { limit } : undefined);
        return NextResponse.json({ results });
      }
      case "entities": {
        const results = await contentSource.searchEntities(q, limit ? { limit } : undefined);
        return NextResponse.json({ results });
      }
      case "items": {
        const results = await contentSource.searchItems(q, limit ? { limit } : undefined);
        return NextResponse.json({ results });
      }
      default: {
        // Non-standard kind (e.g. "anime", "character", "arc") — delegate to searchItemsByKind
        if (contentSource.searchItemsByKind) {
          const results = await contentSource.searchItemsByKind(kind, q, limit ? { limit } : undefined);
          return NextResponse.json({ results });
        }
        // Fallback to generic item search
        const results = await contentSource.searchItems(q, limit ? { limit } : undefined);
        return NextResponse.json({ results });
      }
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Content search failed" }, { status: 502 });
  }
}
