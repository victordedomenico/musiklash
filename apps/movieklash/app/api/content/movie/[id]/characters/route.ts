import { NextResponse } from "next/server";
import { getMovieCharacters, castToCharacterItem } from "@klash/content-adapter";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const movieTitle = new URL(_req.url).searchParams.get("title") ?? "";

  try {
    const cast = await getMovieCharacters(id);
    const items = cast.map((c) =>
      castToCharacterItem(c, {
        id: Number(id),
        title: movieTitle,
        poster_path: null,
      }),
    );
    return NextResponse.json({ items });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch characters" }, { status: 502 });
  }
}
