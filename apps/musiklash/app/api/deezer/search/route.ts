import { NextResponse } from "next/server";
import { searchTracks } from "@/lib/deezer";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  if (!q.trim()) {
    return NextResponse.json({ data: [] });
  }

  try {
    const tracks = await searchTracks(q, 25);
    return NextResponse.json({ data: tracks });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { data: [], error: "Erreur lors de la recherche Deezer" },
      { status: 502 },
    );
  }
}
