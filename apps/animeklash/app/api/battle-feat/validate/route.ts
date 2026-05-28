import { NextResponse } from "next/server";
import { validateCoAppearance } from "@/lib/battle-feat-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      prevArtistId: string;
      nextArtistId: string;
    };
    const { prevArtistId, nextArtistId } = body;

    if (!prevArtistId || !nextArtistId) {
      return NextResponse.json({ valid: false, error: "Paramètres manquants" }, { status: 400 });
    }
    if (prevArtistId === nextArtistId) {
      return NextResponse.json({ valid: false, error: "Même personnage" });
    }

    const result = await validateCoAppearance(prevArtistId, nextArtistId);

    return NextResponse.json({
      valid: result !== null,
      trackTitle: result?.animeTitle ?? null,
      previewUrl: null,
    });
  } catch (err) {
    console.error("[validate]", err);
    return NextResponse.json({ valid: false, error: "Erreur serveur" }, { status: 500 });
  }
}
