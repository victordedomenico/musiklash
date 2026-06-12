import { NextResponse } from "next/server";
import { searchArtists } from "@/lib/deezer";
import { sanitizeArtistForClient } from "@/lib/deezer-sanitize";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  if (!q.trim()) return NextResponse.json({ data: [] });

  try {
    const artists = await searchArtists(q, 20);
    return NextResponse.json({
      data: artists.map((artist) => sanitizeArtistForClient(artist)),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ data: [], error: "Erreur Deezer" }, { status: 502 });
  }
}
