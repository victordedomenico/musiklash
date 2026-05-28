import { NextResponse } from "next/server";
import { pickJokerMoveDeezer } from "@/lib/battle-feat-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { currentArtistId, usedIds } = (await request.json()) as {
      currentArtistId: string;
      usedIds: string[];
    };

    if (!currentArtistId) {
      return NextResponse.json({ artist: null, error: "ID artiste manquant" }, { status: 400 });
    }

    const artist = await pickJokerMoveDeezer(currentArtistId, usedIds ?? []);

    if (!artist) {
      return NextResponse.json({ artist: null }); // No move available even with joker
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
    console.error("[joker]", err);
    return NextResponse.json({ artist: null, error: "Erreur serveur" }, { status: 500 });
  }
}
