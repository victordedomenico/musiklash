import { NextResponse } from "next/server";

// Pas de cache serveur — les preview URLs Deezer sont signées et expirent rapidement
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const res = await fetch(`https://api.deezer.com/track/${id}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const data = await res.json() as { preview?: string };
    return NextResponse.json({ preview: data.preview ?? "" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erreur Deezer" }, { status: 502 });
  }
}
