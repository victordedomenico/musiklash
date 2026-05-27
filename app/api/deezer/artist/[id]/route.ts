import { NextResponse } from "next/server";
import { getArtistById } from "@/lib/deezer";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ data: null }, { status: 400 });

  try {
    const artist = await getArtistById(id);
    if (!artist) return NextResponse.json({ data: null }, { status: 404 });
    return NextResponse.json({ data: artist });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ data: null, error: "Erreur Deezer" }, { status: 502 });
  }
}
