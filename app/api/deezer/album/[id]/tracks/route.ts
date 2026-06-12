import { NextResponse } from "next/server";
import { getAlbumTracks } from "@/lib/deezer";
import { sanitizeAlbumTrackForClient } from "@/lib/deezer-sanitize";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const tracks = await getAlbumTracks(id);
    const data = tracks
      .map((track) => sanitizeAlbumTrackForClient(track))
      .filter((track): track is NonNullable<typeof track> => track !== null);
    return NextResponse.json({ data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ data: [], error: "Erreur Deezer" }, { status: 502 });
  }
}
