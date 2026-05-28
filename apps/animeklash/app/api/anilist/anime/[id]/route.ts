import { NextRequest, NextResponse } from "next/server";
import { getAnimeById, getAnimeThemeItems } from "@klash/content-adapter";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const anime = await getAnimeById(Number(id));
  if (!anime) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ anime });
}
