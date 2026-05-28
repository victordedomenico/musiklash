import { NextRequest, NextResponse } from "next/server";
import { searchAnime, searchCharacters } from "@klash/content-adapter";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const type = req.nextUrl.searchParams.get("type") ?? "anime";
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "20"), 50);

  if (!q.trim()) return NextResponse.json({ data: [] });

  if (type === "character") {
    const results = await searchCharacters(q, limit);
    return NextResponse.json({ data: results });
  }

  const results = await searchAnime(q, limit);
  return NextResponse.json({ data: results });
}
