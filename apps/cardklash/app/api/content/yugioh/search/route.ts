import { NextResponse } from "next/server";
import { searchYgoCards, ygoCardToItem } from "@klash/content-adapter";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json({ results: [] });
  try {
    const cards = await searchYgoCards(q, 20);
    return NextResponse.json({ results: cards.map(ygoCardToItem) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 502 });
  }
}
