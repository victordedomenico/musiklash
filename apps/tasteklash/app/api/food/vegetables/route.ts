import { NextResponse } from "next/server";
import { FOOD_VEGETABLES, ingredientToItem } from "@klash/content-adapter";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.toLowerCase() ?? "";
  const items = FOOD_VEGETABLES
    .filter(([fr, en]) => !q || fr.toLowerCase().includes(q) || en.toLowerCase().includes(q))
    .map(([fr, en]) => ingredientToItem(fr, en, "vegetable"));
  return NextResponse.json({ results: items });
}
