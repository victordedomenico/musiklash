import { isGeniusConfigured, searchGeniusSongs } from "@klash/content-adapter";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({ hits: [] });
  }

  if (!isGeniusConfigured()) {
    return NextResponse.json(
      { hits: [], error: "genius_not_configured" },
      { status: 503 },
    );
  }

  try {
    const hits = await searchGeniusSongs(q, {
      limit: Math.min(
        20,
        Number.parseInt(request.nextUrl.searchParams.get("limit") ?? "10", 10) || 10,
      ),
    });
    return NextResponse.json({ hits });
  } catch (err) {
    console.error("[genius/search]", err);
    return NextResponse.json({ hits: [], error: "genius_upstream_error" }, { status: 502 });
  }
}
