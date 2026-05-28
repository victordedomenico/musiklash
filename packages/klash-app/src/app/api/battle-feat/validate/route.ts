import { NextResponse } from "next/server";
import { getBattleFeatGraph } from "@klash/klash-app/lib/battle-feat/graph-helpers";
import prisma from "@klash/klash-app/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      prevArtistId: string;
      nextArtistId: string;
      /** Optional — used by Deezer bidirectional text search. */
      prevArtistName?: string;
      nextArtistName?: string;
    };
    const { prevArtistId, nextArtistId, prevArtistName, nextArtistName } = body;

    if (!prevArtistId || !nextArtistId) {
      return NextResponse.json({ valid: false, error: "IDs manquants" }, { status: 400 });
    }
    if (prevArtistId === nextArtistId) {
      return NextResponse.json({ valid: false, error: "Même entité" });
    }

    const graph = getBattleFeatGraph(prisma);

    // Use validateWithNames (Deezer live-API path) when names are provided and the method exists.
    if (prevArtistName && nextArtistName && typeof graph.validateWithNames === "function") {
      const result = await graph.validateWithNames(
        prevArtistId,
        prevArtistName,
        nextArtistId,
        nextArtistName,
      );
      return NextResponse.json({
        valid: result.valid,
        trackTitle: result.viaItemId ?? null,
        previewUrl: result.previewUrl ?? null,
      });
    }

    // Fall back to DB-cached validateLink (AniList / Deezer DB path).
    const result = await graph.validateLink(prevArtistId, nextArtistId);
    return NextResponse.json({
      valid: result.valid,
      trackTitle: result.viaItemId ?? null,
      previewUrl: null,
    });
  } catch (err) {
    console.error("[api/battle-feat/validate]", err);
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
