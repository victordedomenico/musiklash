import { NextResponse } from "next/server";
import { getSoloEasyOptionsForBattleFeat } from "@klash/klash-app/lib/battle-feat/graph-helpers";
import prisma from "@klash/klash-app/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      currentArtistId: string;
      usedIds?: string[];
    };
    const { currentArtistId, usedIds = [] } = body;

    if (!currentArtistId) return NextResponse.json({ options: [] });

    const options = await getSoloEasyOptionsForBattleFeat(prisma, currentArtistId, usedIds, 4);
    return NextResponse.json({
      options: options.map((e) => ({
        id: e.id,
        name: e.name,
        nameSlug: e.name.toLowerCase().replace(/[^a-z0-9]/g, ""),
        fanCount: e.fanCount,
        favourites: e.fanCount,
        popularityTier: e.popularityTier,
        pictureUrl: e.pictureUrl,
      })),
    });
  } catch (err) {
    console.error("[api/battle-feat/options]", err);
    return NextResponse.json({ options: [] }, { status: 500 });
  }
}
