import { NextResponse } from "next/server";
import { sanitizeTrackForClient } from "@/lib/deezer-sanitize";
import { parsePickerGenre, searchTracksForPicker } from "@/lib/deezer-picker-search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const genre = parsePickerGenre(searchParams.get("genre"));

  if (!q.trim() && !genre) {
    return NextResponse.json({ data: [] });
  }

  try {
    const tracks = await searchTracksForPicker(q, genre, 25);
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
