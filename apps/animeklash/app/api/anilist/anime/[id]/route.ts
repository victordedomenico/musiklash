import { NextRequest, NextResponse } from "next/server";
import { getAnimeById } from "@klash/content-adapter";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const anime = await getAnimeById(Number(id));
  if (!anime) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({
    anime: {
      id: anime.id,
      title: anime.title.english ?? anime.title.romaji ?? anime.title.native ?? String(anime.id),
      coverUrl: anime.coverImage.large ?? anime.coverImage.medium ?? null,
      bannerUrl: anime.bannerImage ?? null,
      episodes: anime.episodes ?? null,
      status: anime.status,
      popularity: anime.popularity,
      averageScore: anime.averageScore,
      genres: anime.genres,
      idMal: anime.idMal,
    },
  });
}
