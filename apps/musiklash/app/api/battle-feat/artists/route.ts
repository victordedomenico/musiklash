import { NextResponse } from "next/server";
import { searchArtists } from "@/lib/deezer";
import { slugifyName, popularityTier } from "@/lib/battle-feat";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (!q || q.length < 2) return NextResponse.json({ data: [] });

  try {
    const results = await searchArtists(q, 10);
    const data = results.map((a) => ({
      id: String(a.id),
      name: a.name,
      nameSlug: slugifyName(a.name),
      fanCount: a.nb_fan ?? 0,
      popularityTier: popularityTier(a.nb_fan ?? 0),
      pictureUrl: a.picture_medium ?? a.picture_small ?? null,
    }));
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[artists]", err);
    return NextResponse.json({ data: [], error: "Erreur Deezer" }, { status: 502 });
  }
}
