import { NextResponse } from "next/server";
import { getTrackPreview } from "@/lib/deezer";
import { DEEZER_PREVIEW_RESPONSE_HEADERS } from "@/lib/deezer-sanitize";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const preview = await getTrackPreview(id);
    if (!preview) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ preview }, { headers: DEEZER_PREVIEW_RESPONSE_HEADERS });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erreur Deezer" }, { status: 502 });
  }
}
