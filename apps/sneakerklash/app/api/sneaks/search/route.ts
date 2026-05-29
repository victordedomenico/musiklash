import { NextResponse } from "next/server";
import { searchSneakers } from "@klash/content-adapter/sneaks";

export const dynamic = "force-dynamic";

/**
 * Proxy serveur explicite vers SneaksAPI (scraping).
 * Le picker utilise plutôt `/api/content/search` ; cette route sert au debug et aux intégrations.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  const limitParam = new URL(req.url).searchParams.get("limit");
  const limit = limitParam ? Math.min(Number(limitParam) || 20, 40) : 20;

  if (!q) return NextResponse.json({ results: [] });

  try {
    const results = await searchSneakers(q, limit);
    return NextResponse.json({ results, source: "sneaks" });
  } catch (err) {
    console.error("[api/sneaks/search]", err);
    return NextResponse.json({ error: "Sneaks search failed" }, { status: 502 });
  }
}
