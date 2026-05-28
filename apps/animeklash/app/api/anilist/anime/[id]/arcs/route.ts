import { NextResponse } from "next/server";
import { getAnimeArcs } from "@klash/content-adapter";

function arcTitle(a: {
  title: { romaji: string; english: string | null; native: string | null };
}): string {
  return a.title.english ?? a.title.romaji ?? a.title.native ?? "";
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idParam } = await params;
  const id = parseInt(idParam, 10);
  if (!id) return NextResponse.json({ data: [] });

  try {
    const arcs = await getAnimeArcs(id);
    return NextResponse.json({
      data: arcs.map((a) => ({
        id: a.id,
        title: arcTitle(a),
        coverUrl: a.coverImage.large ?? a.coverImage.medium ?? null,
        parentTitle: a.parentTitle ?? null,
        format: a.format ?? null,
        episodes: a.episodes ?? null,
      })),
    });
  } catch (err) {
    console.error("[anilist/arcs]", err);
    return NextResponse.json({ data: [], error: "Erreur AniList" }, { status: 502 });
  }
}
