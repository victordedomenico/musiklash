import { NextResponse } from "next/server";
import { getPokemonSets, pokemonSetToItem } from "@klash/content-adapter";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  try {
    const sets = await getPokemonSets(q || undefined, 30);
    return NextResponse.json({ results: sets.map(pokemonSetToItem) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 502 });
  }
}
