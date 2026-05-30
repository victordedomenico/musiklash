import { NextResponse } from "next/server";
import { getFastFoodByChain, offProductToItem, FAST_FOOD_CHAINS } from "@klash/content-adapter";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const chain = FAST_FOOD_CHAINS.find((c) => c.slug === slug);
  try {
    const products = await getFastFoodByChain(slug, 24);
    return NextResponse.json({
      results: products.map((p) => offProductToItem(p, chain?.label)),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 502 });
  }
}
