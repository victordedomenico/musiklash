import { NextResponse } from "next/server";
import { getYgoSetCards, ygoCardToItem } from "@klash/content-adapter";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // id = set_code (URL-encoded), set name passed via query param for accuracy
  const setName = new URL(req.url).searchParams.get("name") ?? decodeURIComponent(id);
  try {
    const cards = await getYgoSetCards(setName, 50);
    return NextResponse.json({ results: cards.map(ygoCardToItem) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 502 });
  }
}
