import { NextResponse } from "next/server";
import { popularityTier } from "@/lib/battle-feat";

const ANILIST_URL = "https://graphql.anilist.co";

const SEARCH_CHARACTER_QUERY = `
query SearchCharacter($search: String, $perPage: Int) {
  Page(perPage: $perPage) {
    characters(search: $search, sort: [SEARCH_MATCH, FAVOURITES_DESC]) {
      id
      name { full }
      image { medium }
      favourites
      media(type: ANIME, perPage: 1, sort: [POPULARITY_DESC]) {
        nodes { id title { romaji english } }
      }
    }
  }
}`;

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (!q || q.length < 2) return NextResponse.json({ data: [] });

  try {
    const res = await fetch(ANILIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        query: SEARCH_CHARACTER_QUERY,
        variables: { search: q, perPage: 10 },
      }),
      cache: "no-store",
    });

    if (!res.ok) return NextResponse.json({ data: [] }, { status: 502 });

    const json = await res.json() as {
      data?: {
        Page?: {
          characters?: Array<{
            id: number;
            name: { full: string };
            image: { medium: string | null };
            favourites: number;
            media?: { nodes: Array<{ id: number; title: { romaji: string; english: string | null } }> };
          }>;
        };
      };
    };

    const chars = json.data?.Page?.characters ?? [];
    const data = chars.map((c) => ({
      id: String(c.id),
      name: c.name.full,
      nameSlug: c.name.full.toLowerCase().replace(/[^a-z0-9]/g, ""),
      favourites: c.favourites,
      popularityTier: popularityTier(c.favourites),
      pictureUrl: c.image.medium ?? null,
      animeTitle: c.media?.nodes[0]
        ? (c.media.nodes[0].title.english ?? c.media.nodes[0].title.romaji)
        : null,
    }));

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[artists search]", err);
    return NextResponse.json({ data: [], error: "Erreur AniList" }, { status: 502 });
  }
}
