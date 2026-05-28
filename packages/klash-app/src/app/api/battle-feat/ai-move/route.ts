import { NextResponse } from "next/server";
import { pickAiMoveForBattleFeat } from "@klash/klash-app/lib/battle-feat/graph-helpers";
import prisma from "@klash/klash-app/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      currentArtistId: string;
      difficulty?: number;
      usedIds?: string[];
    };
    const { currentArtistId, difficulty = 2, usedIds = [] } = body;

    if (!currentArtistId) return NextResponse.json({ artist: null });

    const move = await pickAiMoveForBattleFeat(prisma, currentArtistId, difficulty, usedIds);
    if (!move) return NextResponse.json({ artist: null });

    return NextResponse.json({
      artist: {
        id: move.id,
        name: move.name,
        pictureUrl: move.pictureUrl,
        trackTitle: move.trackTitle,
        previewUrl: null,
        fanCount: move.fanCount,
        popularityTier: move.popularityTier,
      },
    });
  } catch (err) {
    console.error("[api/battle-feat/ai-move]", err);
    return NextResponse.json({ artist: null }, { status: 500 });
  }
}
