import { NextResponse } from "next/server";
import { sanitizeArtistForClient } from "@/lib/deezer-sanitize";
import { parsePickerGenre, searchArtistsForPicker } from "@/lib/deezer-picker-search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const genre = parsePickerGenre(searchParams.get("genre"));

  if (!q.trim() && !genre) {
    return NextResponse.json({ data: [] });
  }

  try {
    const artists = await searchArtistsForPicker(q, genre, 20);
    return NextResponse.json({
      data: artists.map((artist) => sanitizeArtistForClient(artist)),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ data: [], error: "Erreur Deezer" }, { status: 502 });
  }
}
