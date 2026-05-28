import { NextResponse } from "next/server";
import { getArtistAlbums } from "@/lib/deezer";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const albums = await getArtistAlbums(id);
    return NextResponse.json({ data: albums });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ data: [], error: "Erreur Deezer" }, { status: 502 });
  }
}
