import { NextResponse } from "next/server";
import { validateFeatLinkDeezerBidirectional } from "@/lib/battle-feat-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      prevArtistId: string;
      prevArtistName: string;
      nextArtistId: string;
      nextArtistName: string;
    };
    const { prevArtistId, prevArtistName, nextArtistId, nextArtistName } = body;

    if (!prevArtistId || !nextArtistId || !prevArtistName || !nextArtistName) {
      return NextResponse.json({ valid: false, error: "Paramètres manquants" }, { status: 400 });
    }
    if (prevArtistId === nextArtistId) {
      return NextResponse.json({ valid: false, error: "Même artiste" });
    }

    const feat = await validateFeatLinkDeezerBidirectional(
      prevArtistId,
      prevArtistName,
      nextArtistId,
      nextArtistName,
    );

    return NextResponse.json({
      valid: feat !== null,
      trackTitle: feat?.trackTitle ?? null,
      previewUrl: feat?.previewUrl ?? null,
    });
  } catch (err) {
    console.error("[validate]", err);
    return NextResponse.json({ valid: false, error: "Erreur serveur" }, { status: 500 });
  }
}
