import { NextResponse } from "next/server";
import { getCurrentVertical } from "@klash/klash-config";
import { popularityTierFromFanCount } from "@klash/klash-app/lib/battle-feat/graph-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) return NextResponse.json({ data: [] });

    const { contentSource } = getCurrentVertical();
    const entities = await contentSource.searchEntities(q, { limit: 10 });

    const data = entities.map((e) => ({
      id: e.id,
      name: e.name,
      nameSlug: e.name.toLowerCase().replace(/[^a-z0-9]/g, ""),
      fanCount: e.fanCount ?? 0,
      favourites: e.fanCount ?? 0,
      popularityTier: popularityTierFromFanCount(e.fanCount ?? 0),
      pictureUrl: e.pictureUrl ?? null,
    }));

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[api/battle-feat/artists]", err);
    return NextResponse.json({ data: [], error: "Erreur recherche" }, { status: 502 });
  }
}
