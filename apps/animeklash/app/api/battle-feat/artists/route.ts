import { NextResponse } from "next/server";
import { searchCharacters } from "@klash/content-adapter";
import { popularityTier } from "@/lib/battle-feat";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (!q || q.length < 2) return NextResponse.json({ data: [] });

  try {
    const chars = await searchCharacters(q, 10);
    const data = chars.map((c) => ({
      id: String(c.id),
      name: c.name.full,
      nameSlug: c.name.full.toLowerCase().replace(/[^a-z0-9]/g, ""),
      favourites: c.favourites,
      popularityTier: popularityTier(c.favourites),
      pictureUrl: c.image.medium ?? c.image.large ?? null,
      animeTitle: c.media?.nodes[0]?.title?.romaji ?? null,
    }));

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[artists search]", err);
    return NextResponse.json({ data: [], error: "Erreur AniList" }, { status: 502 });
  }
}
