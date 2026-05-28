import { NextResponse } from "next/server";
import { pickJokerMoveForBattleFeat } from "@klash/klash-app/lib/battle-feat/graph-helpers";
import prisma from "@klash/klash-app/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      currentArtistId: string;
      usedIds?: string[];
    };
    const { currentArtistId, usedIds = [] } = body;

    if (!currentArtistId) return NextResponse.json({ artist: null });

    const move = await pickJokerMoveForBattleFeat(prisma, currentArtistId, usedIds);
    if (!move) return NextResponse.json({ artist: null });

    return NextResponse.json({
      artist: {
        id: move.id,
        name: move.name,
        pictureUrl: move.pictureUrl,
        trackTitle: move.trackTitle,
        fanCount: move.fanCount,
      },
    });
  } catch (err) {
    console.error("[api/battle-feat/joker]", err);
    return NextResponse.json({ artist: null }, { status: 500 });
  }
}
