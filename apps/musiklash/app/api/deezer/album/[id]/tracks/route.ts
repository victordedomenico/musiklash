import { NextResponse } from "next/server";
import { getAlbumTracks } from "@/lib/deezer";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const tracks = await getAlbumTracks(id);
    return NextResponse.json({ data: tracks });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ data: [], error: "Erreur Deezer" }, { status: 502 });
  }
}
