import { NextResponse } from "next/server";
import { pickAiMoveDeezer } from "@/lib/battle-feat-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { currentArtistId, difficulty, usedIds } = (await request.json()) as {
      currentArtistId: string;
      difficulty: number;
      usedIds: string[];
    };

    if (!currentArtistId) {
      return NextResponse.json({ artist: null, error: "ID artiste manquant" }, { status: 400 });
    }

    const artist = await pickAiMoveDeezer(currentArtistId, difficulty, usedIds ?? []);

    if (!artist) {
      return NextResponse.json({ artist: null });
    }

    return NextResponse.json({
      artist: {
        id: artist.id,
        name: artist.name,
        pictureUrl: artist.pictureUrl,
        trackTitle: artist.trackTitle,
        previewUrl: artist.previewUrl,
      },
    });
  } catch (err) {
    console.error("[ai-move]", err);
    return NextResponse.json({ artist: null, error: "Erreur serveur" }, { status: 500 });
  }
}
