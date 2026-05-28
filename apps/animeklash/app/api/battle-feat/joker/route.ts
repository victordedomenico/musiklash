import { NextResponse } from "next/server";
import { pickJokerMove } from "@/lib/battle-feat-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      currentArtistId: string;
      usedIds: string[];
    };
    const { currentArtistId, usedIds = [] } = body;

    if (!currentArtistId) return NextResponse.json({ artist: null });

    const move = await pickJokerMove(currentArtistId, usedIds);
    if (!move) return NextResponse.json({ artist: null });

    return NextResponse.json({
      artist: {
        id: move.id,
        name: move.name,
        pictureUrl: move.pictureUrl,
        trackTitle: move.animeTitle,
      },
    });
  } catch (err) {
    console.error("[joker]", err);
    return NextResponse.json({ artist: null }, { status: 500 });
  }
}
