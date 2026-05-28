import { NextResponse } from "next/server";
import { getSoloEasyOptions } from "@/lib/battle-feat-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      currentArtistId: string;
      usedIds: string[];
    };
    const { currentArtistId, usedIds = [] } = body;

    if (!currentArtistId) return NextResponse.json({ options: [] });

    const options = await getSoloEasyOptions(currentArtistId, usedIds, 4);
    return NextResponse.json({
      options: options.map((c) => ({
        id: c.id,
        name: c.name,
        nameSlug: c.name.toLowerCase().replace(/[^a-z0-9]/g, ""),
        favourites: c.favourites,
        popularityTier: c.popularityTier,
        pictureUrl: c.pictureUrl,
      })),
    });
  } catch (err) {
    console.error("[options]", err);
    return NextResponse.json({ options: [] }, { status: 500 });
  }
}
