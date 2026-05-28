import { NextRequest, NextResponse } from "next/server";
import { getCharacterById } from "@klash/content-adapter";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const character = await getCharacterById(Number(id));
  if (!character) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({
    character: {
      id: character.id,
      name: character.name.full,
      nativeName: character.name.native,
      imageUrl: character.image.large ?? character.image.medium ?? null,
      favourites: character.favourites,
      animes: (character.media?.nodes ?? []).map((m) => m.title.romaji).filter(Boolean),
    },
  });
}
