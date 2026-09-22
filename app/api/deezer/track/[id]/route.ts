import { NextResponse } from "next/server";
import { getTrackInfo } from "@/lib/deezer";
import { DEEZER_PREVIEW_RESPONSE_HEADERS } from "@/lib/deezer-sanitize";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const info = await getTrackInfo(id);
    if (!info) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(
      { preview: info.preview, album: info.album, artist: info.artist },
      { headers: DEEZER_PREVIEW_RESPONSE_HEADERS },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erreur Deezer" }, { status: 502 });
  }
}
