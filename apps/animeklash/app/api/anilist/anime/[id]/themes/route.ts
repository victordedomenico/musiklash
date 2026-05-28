import { NextRequest, NextResponse } from "next/server";
import { getAnimeThemeItems } from "@klash/content-adapter";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const items = await getAnimeThemeItems(Number(id));
  return NextResponse.json({
    data: items.map((item) => ({
      id: item.id,
      title: item.title,
      type: String(item.metadata?.themeType ?? ""),
      videoUrl: item.previewUrl ?? null,
      coverUrl: item.coverUrl ?? null,
      animeTitle: String(item.metadata?.animeTitle ?? ""),
    })),
  });
}
