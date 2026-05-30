import { NextResponse } from "next/server";
import { getDrinksByCategory, offProductToItem, DRINK_CATEGORIES } from "@klash/content-adapter";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const category = DRINK_CATEGORIES.find((c) => c.slug === decodedSlug);
  try {
    const products = await getDrinksByCategory(decodedSlug, 24);
    return NextResponse.json({
      results: products.map((p) => offProductToItem(p, category?.label)),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 502 });
  }
}
