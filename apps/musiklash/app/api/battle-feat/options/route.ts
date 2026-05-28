import { NextResponse } from "next/server";
import { getSoloEasyOptionsDeezer } from "@/lib/battle-feat-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { currentArtistId, usedIds } = (await request.json()) as {
      currentArtistId: string;
      usedIds: string[];
    };

    if (!currentArtistId) {
      return NextResponse.json({ options: [], error: "ID artiste manquant" }, { status: 400 });
    }

    const options = await getSoloEasyOptionsDeezer(currentArtistId, usedIds ?? [], 4);
    return NextResponse.json({
      options: options.map((artist) => ({
        id: artist.id,
        name: artist.name,
        nameSlug: "",
        fanCount: artist.fanCount,
        popularityTier: artist.popularityTier,
        pictureUrl: artist.pictureUrl,
      })),
    });
  } catch (err) {
    console.error("[options]", err);
    return NextResponse.json({ options: [], error: "Erreur serveur" }, { status: 500 });
  }
}
