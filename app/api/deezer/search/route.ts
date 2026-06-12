import { NextResponse } from "next/server";
import { searchTracks } from "@/lib/deezer";
import { sanitizeTrackForClient } from "@/lib/deezer-sanitize";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  if (!q.trim()) {
    return NextResponse.json({ data: [] });
  }

  try {
    const tracks = await searchTracks(q, 25);
    const data = tracks
      .map((track) => sanitizeTrackForClient(track))
      .filter((track): track is NonNullable<typeof track> => track !== null);
    return NextResponse.json({ data });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { data: [], error: "Erreur lors de la recherche Deezer" },
      { status: 502 },
    );
  }
}
