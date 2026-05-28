import { NextResponse } from "next/server";
import { searchAlbums } from "@/lib/deezer";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  if (!q.trim()) return NextResponse.json({ data: [] });

  try {
    const albums = await searchAlbums(q, 20);
    return NextResponse.json({ data: albums });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ data: [], error: "Erreur Deezer" }, { status: 502 });
  }
}
