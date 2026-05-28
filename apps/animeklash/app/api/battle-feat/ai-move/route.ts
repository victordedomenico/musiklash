import { NextResponse } from "next/server";
import { pickAiMove } from "@/lib/battle-feat-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      currentArtistId: string;
      difficulty: number;
      usedIds: string[];
    };
    const { currentArtistId, difficulty = 2, usedIds = [] } = body;

    if (!currentArtistId) {
      return NextResponse.json({ artist: null });
    }

    const move = await pickAiMove(currentArtistId, difficulty, usedIds);
    if (!move) return NextResponse.json({ artist: null });

    return NextResponse.json({
      artist: {
        id: move.id,
        name: move.name,
        pictureUrl: move.pictureUrl,
        trackTitle: move.animeTitle,
        previewUrl: null,
      },
    });
  } catch (err) {
    console.error("[ai-move]", err);
    return NextResponse.json({ artist: null }, { status: 500 });
  }
}
