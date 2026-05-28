import { NextRequest, NextResponse } from "next/server";
import { searchAnime, searchAnimeArcs, searchCharacters } from "@klash/content-adapter";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const type = req.nextUrl.searchParams.get("type") ?? "anime";
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "20"), 50);

  if (!q.trim()) return NextResponse.json({ data: [] });

  try {
  if (type === "arc") {
    const results = await searchAnimeArcs(q, limit);
    return NextResponse.json({
      data: results.map((a) => ({
        id: a.id,
        title: a.title.english ?? a.title.romaji ?? a.title.native ?? String(a.id),
        coverUrl: a.coverImage.large ?? a.coverImage.medium ?? null,
        parentTitle: a.parentTitle ?? null,
        format: a.format ?? null,
        episodes: a.episodes ?? null,
      })),
    });
  }

  if (type === "character") {
    const results = await searchCharacters(q, limit);
    return NextResponse.json({
      data: results.map((c) => ({
        id: c.id,
        name: c.name.full,
        imageUrl: c.image.large ?? c.image.medium ?? null,
        animes: (c.media?.nodes ?? []).map((m) => m.title.romaji).filter(Boolean).slice(0, 3),
      })),
    });
  }

  const results = await searchAnime(q, limit);
  return NextResponse.json({
    data: results.map((a) => ({
      id: a.id,
      title: a.title.english ?? a.title.romaji ?? a.title.native ?? String(a.id),
      coverUrl: a.coverImage.large ?? a.coverImage.medium ?? null,
      bannerUrl: a.bannerImage ?? null,
      format: a.status,
      episodes: a.episodes ?? null,
      popularity: a.popularity,
    })),
  });
  } catch (err) {
    console.error("[anilist/search]", err);
    return NextResponse.json({ data: [], error: "search_failed" }, { status: 502 });
  }
}
