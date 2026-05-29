import { NextResponse } from "next/server";
import { getPokemonSetCards, pokemonCardToItem } from "@klash/content-adapter";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const cards = await getPokemonSetCards(id, 50);
    return NextResponse.json({ results: cards.map(pokemonCardToItem) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 502 });
  }
}
