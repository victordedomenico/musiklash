import { NextRequest, NextResponse } from "next/server";
import { getAnimeThemeItems } from "@klash/content-adapter";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const items = await getAnimeThemeItems(Number(id));
  return NextResponse.json({ data: items });
}
